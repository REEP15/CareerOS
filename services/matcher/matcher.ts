import { doc, getDoc, getDocs, orderBy, query, setDoc } from "firebase/firestore";

import {
  COLLECTIONS,
  getDb,
  getJobsCollection,
  getMatchesCollection,
  isFirebaseConfigured,
} from "@/lib/firebase";
import { parseMatchResponse } from "@/services/matcher/parser";
import { createJobMatchPrompt } from "@/services/matcher/prompts";
import { calculateOverallScore, clampScore } from "@/services/matcher/scoring";
import { getJobMatchProvider } from "@/lib/ai";
import type { JobPosting } from "@/types/job";
import type { MatchResult } from "@/types/match";
import type { ResumeProfile } from "@/types/resume";

export async function matchJob(resume: ResumeProfile, job: JobPosting): Promise<MatchResult> {
  const provider = getJobMatchProvider();
  const prompt = createJobMatchPrompt(resume, job);
  const parsedEvaluation = provider
    ? parseMatchResponse((await provider.evaluateJobMatch({ prompt, resume, job })) ?? "")
    : buildFallbackEvaluation(resume, job);
  const overallScore = calculateOverallScore(parsedEvaluation);

  return {
    jobId: job.id,
    overallScore,
    confidence: clampScore(parsedEvaluation.confidence),
    skillsScore: clampScore(parsedEvaluation.skillsScore),
    experienceScore: clampScore(parsedEvaluation.experienceScore),
    educationScore: clampScore(parsedEvaluation.educationScore),
    locationScore: clampScore(parsedEvaluation.locationScore),
    salaryScore: clampScore(parsedEvaluation.salaryScore),
    resumePassProbability: clampScore(parsedEvaluation.resumePassProbability),
    interviewProbability: clampScore(parsedEvaluation.interviewProbability),
    strengths: parsedEvaluation.strengths.slice(0, 5),
    weaknesses: parsedEvaluation.weaknesses.slice(0, 5),
    missingSkills: parsedEvaluation.missingSkills.slice(0, 8),
    reasoning: parsedEvaluation.reasoning,
    recommended: parsedEvaluation.recommended || overallScore >= 70,
    createdAt: new Date().toISOString(),
  };
}

export async function saveMatchResults(results: MatchResult[]) {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase environment variables are missing.");
  }

  for (const result of results) {
    await setDoc(doc(getDb(), COLLECTIONS.matches, result.jobId), result);
  }
}

export async function getStoredMatches(): Promise<MatchResult[]> {
  if (!isFirebaseConfigured()) {
    return [];
  }

  const snapshot = await getDocs(query(getMatchesCollection(), orderBy("overallScore", "desc")));
  return snapshot.docs.map((document) => document.data());
}

export async function getMatchForJob(jobId: string): Promise<MatchResult | null> {
  if (!isFirebaseConfigured()) {
    return null;
  }

  const snapshot = await getDoc(doc(getDb(), COLLECTIONS.matches, jobId));
  return snapshot.exists() ? (snapshot.data() as MatchResult) : null;
}

export async function loadPrimaryResumeProfile(): Promise<ResumeProfile | null> {
  if (!isFirebaseConfigured()) {
    return null;
  }

  const snapshot = await getDoc(doc(getDb(), COLLECTIONS.resume, "primary"));

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as ResumeProfile;
}

export async function loadStoredJobs(): Promise<JobPosting[]> {
  if (!isFirebaseConfigured()) {
    return [];
  }

  const snapshot = await getDocs(query(getJobsCollection(), orderBy("scrapedAt", "desc")));
  return snapshot.docs.map((document) => document.data());
}

function buildFallbackEvaluation(resume: ResumeProfile, job: JobPosting) {
  const normalizedResumeSkills = new Set(resume.skills.map((skill) => skill.trim().toLowerCase()));
  const jobKeywords = extractKeywords(`${job.title} ${job.description}`);
  const matchedSkills = [...normalizedResumeSkills].filter((skill) => jobKeywords.has(skill));
  const missingSkills = [...jobKeywords].filter((keyword) => !normalizedResumeSkills.has(keyword)).slice(0, 5);
  const skillsScore = jobKeywords.size > 0 ? (matchedSkills.length / jobKeywords.size) * 100 : 60;
  const experienceScore = inferExperienceScore(resume, jobKeywords);
  const educationScore = resume.education.length > 0 ? 75 : 35;
  const locationScore = inferLocationScore(resume, job);
  const salaryScore = inferSalaryScore(job);
  const overallScore = calculateOverallScore({
    skillsScore,
    experienceScore,
    educationScore,
    locationScore,
    salaryScore,
  });

  return {
    confidence: matchedSkills.length > 0 ? 72 : 55,
    skillsScore,
    experienceScore,
    educationScore,
    locationScore,
    salaryScore,
    resumePassProbability: clampScore(overallScore * 0.85 + skillsScore * 0.15),
    interviewProbability: clampScore(overallScore * 0.7 + experienceScore * 0.3),
    strengths: [
      matchedSkills.length > 0 ? `Aligned skills: ${matchedSkills.slice(0, 3).join(", ")}` : "Broad technical foundation",
      resume.preferredRoles.some((role) => job.title.toLowerCase().includes(role.toLowerCase()))
        ? "Preferred role alignment"
        : "Relevant role adjacency",
    ],
    weaknesses: [
      missingSkills.length > 0 ? `Gaps around ${missingSkills.slice(0, 2).join(", ")}` : "Limited explicit evidence in the resume",
    ],
    missingSkills,
    reasoning: buildFallbackReasoning({
      matchedSkills,
      missingSkills,
      locationScore,
      experienceScore,
      educationScore,
    }),
    recommended: overallScore >= 70,
  };
}

function inferExperienceScore(resume: ResumeProfile, jobKeywords: Set<string>) {
  const resumeSignals = [
    ...resume.experience.flatMap((experience) => [experience.title, experience.company, ...experience.highlights]),
    ...resume.projects.flatMap((project) => [project.name, project.description, ...project.technologies]),
    resume.summary,
  ]
    .join(" ")
    .toLowerCase();

  const matchingKeywords = [...jobKeywords].filter((keyword) => resumeSignals.includes(keyword));
  const baseline = resume.experience.length > 0 ? 55 : 30;
  return baseline + Math.min(40, matchingKeywords.length * 8);
}

function inferLocationScore(resume: ResumeProfile, job: JobPosting) {
  const preferredLocations = resume.preferredLocations.map((location) => location.toLowerCase());
  const preferredRoleLocations = resume.personal.location.toLowerCase();
  const jobLocation = job.location.toLowerCase();

  if (jobLocation.includes("remote")) {
    return 95;
  }

  if (preferredLocations.some((location) => jobLocation.includes(location))) {
    return 90;
  }

  if (jobLocation.includes(preferredRoleLocations)) {
    return 80;
  }

  return 50;
}

function inferSalaryScore(job: JobPosting) {
  return job.salary ? 75 : 50;
}

function extractKeywords(content: string) {
  const normalizedContent = content.toLowerCase();
  const trackedKeywords = [
    "typescript",
    "javascript",
    "react",
    "next.js",
    "nextjs",
    "node.js",
    "node",
    "firebase",
    "docker",
    "aws",
    "sql",
    "python",
    "ai",
    "machine learning",
    "frontend",
    "full stack",
    "platform",
    "product",
  ];

  return new Set(
    trackedKeywords
      .filter((keyword) => normalizedContent.includes(keyword))
      .map((keyword) => keyword.replace(".js", "").replace("nextjs", "next.js")),
  );
}

function buildFallbackReasoning({
  matchedSkills,
  missingSkills,
  locationScore,
  experienceScore,
  educationScore,
}: {
  matchedSkills: string[];
  missingSkills: string[];
  locationScore: number;
  experienceScore: number;
  educationScore: number;
}) {
  const strengths = matchedSkills.length > 0 ? `The resume aligns on ${matchedSkills.slice(0, 3).join(", ")}.` : "The resume shows adjacent technical experience.";
  const gaps = missingSkills.length > 0 ? `The largest gaps are ${missingSkills.slice(0, 3).join(", ")}.` : "No major skill gaps were inferred from the posting text.";
  const context = `Location fit scored ${locationScore}, experience fit scored ${experienceScore}, and education fit scored ${educationScore}.`;
  return `${strengths} ${gaps} ${context}`.trim();
}
