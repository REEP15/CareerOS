import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";

import { getResumeTailoringProvider } from "@/lib/ai";
import { COLLECTIONS, getDb, isFirebaseConfigured } from "@/lib/firebase";
import { loadPrimaryResumeProfile } from "@/services/matcher/matcher";
import { parseTailoredResumeResponse } from "@/services/tailoring/parser";
import { writeTextPdf } from "@/services/tailoring/pdf";
import { createResumeTailoringPrompt } from "@/services/tailoring/prompts";
import type { JobPosting } from "@/types/job";
import type { MatchResult } from "@/types/match";
import type { ResumeProfile } from "@/types/resume";
import type { ResumeDiff, TailoredResume } from "@/types/tailoredResume";

export async function generateTailoredResume(job: JobPosting, match: MatchResult | null) {
  const resume = await loadPrimaryResumeProfile();

  if (!resume) {
    throw new Error("No ResumeProfile found. Upload a resume before tailoring.");
  }

  const generated = await createTailoredResume(resume, job, match);
  await setDoc(doc(getDb(), COLLECTIONS.tailoredResumes, generated.id), generated);

  return generated;
}

export async function getTailoredResume(jobId: string): Promise<TailoredResume | null> {
  if (!isFirebaseConfigured()) {
    return null;
  }

  const snapshot = await getDoc(doc(getDb(), COLLECTIONS.tailoredResumes, jobId));
  return snapshot.exists() ? (snapshot.data() as TailoredResume) : null;
}

export async function getTailoredResumes(): Promise<TailoredResume[]> {
  if (!isFirebaseConfigured()) {
    return [];
  }

  const snapshot = await getDocs(collection(getDb(), COLLECTIONS.tailoredResumes));
  return snapshot.docs.map((document) => document.data() as TailoredResume);
}

async function createTailoredResume(resume: ResumeProfile, job: JobPosting, match: MatchResult | null) {
  const provider = getResumeTailoringProvider();
  const prompt = createResumeTailoringPrompt(resume, job, match);
  const response = provider ? await provider.tailorResume({ prompt, resume, job, match }) : null;
  const parsed = response ? parseTailoredResumeResponse(response) : buildFallbackTailoredResume(resume, job, match);
  const profile = enforceNoFabrication(resume, parsed.profile);
  const diff = normalizeDiff(resume, profile, parsed.diff);
  const { pdfUrl } = await writeTextPdf({
    fileName: `${job.id}-tailored-resume.pdf`,
    lines: resumeProfileToPdfLines(profile, job),
  });

  return {
    id: job.id,
    jobId: job.id,
    profile,
    diff,
    pdfUrl,
    createdAt: new Date().toISOString(),
  } satisfies TailoredResume;
}

function buildFallbackTailoredResume(resume: ResumeProfile, job: JobPosting, match: MatchResult | null) {
  const jobText = `${job.title} ${job.description}`.toLowerCase();
  const reorderedSkills = [...resume.skills].sort((left, right) => {
    const leftRelevant = jobText.includes(left.toLowerCase()) ? 1 : 0;
    const rightRelevant = jobText.includes(right.toLowerCase()) ? 1 : 0;
    return rightRelevant - leftRelevant;
  });
  const prioritizedProjects = [...resume.projects].sort((left, right) => {
    const leftScore = left.technologies.filter((tech) => jobText.includes(tech.toLowerCase())).length;
    const rightScore = right.technologies.filter((tech) => jobText.includes(tech.toLowerCase())).length;
    return rightScore - leftScore;
  });
  const keywordOptimizations = reorderedSkills.filter((skill) => jobText.includes(skill.toLowerCase())).slice(0, 6);
  const tailoredSummary = `${resume.summary} Targeted for ${job.title} roles at ${job.company}, emphasizing ${keywordOptimizations.slice(0, 3).join(", ") || "relevant experience"}.`;

  return {
    profile: {
      ...resume,
      summary: tailoredSummary,
      skills: reorderedSkills,
      projects: prioritizedProjects,
      updatedAt: new Date().toISOString(),
    },
    diff: {
      summary: {
        before: resume.summary,
        after: tailoredSummary,
      },
      skills: {
        before: resume.skills,
        after: reorderedSkills,
      },
      prioritizedProjects: prioritizedProjects.map((project) => project.name),
      keywordOptimizations: match?.missingSkills.length ? keywordOptimizations.filter((skill) => !match.missingSkills.includes(skill)) : keywordOptimizations,
    },
  };
}

function enforceNoFabrication(master: ResumeProfile, tailored: ResumeProfile): ResumeProfile {
  const masterProjectNames = new Set(master.projects.map((project) => project.name));
  const masterCompanies = new Set(master.experience.map((experience) => experience.company));
  const masterCertifications = new Set(master.certifications);
  const masterSkills = new Set(master.skills);

  return {
    ...master,
    summary: tailored.summary,
    skills: tailored.skills.filter((skill) => masterSkills.has(skill)),
    projects: tailored.projects.filter((project) => masterProjectNames.has(project.name)),
    experience: tailored.experience.filter((experience) => masterCompanies.has(experience.company)),
    certifications: tailored.certifications.filter((certification) => masterCertifications.has(certification)),
    updatedAt: new Date().toISOString(),
  };
}

function normalizeDiff(master: ResumeProfile, tailored: ResumeProfile, diff: ResumeDiff): ResumeDiff {
  return {
    summary: {
      before: master.summary,
      after: tailored.summary,
    },
    skills: {
      before: master.skills,
      after: tailored.skills,
    },
    prioritizedProjects: diff.prioritizedProjects.filter((projectName) =>
      tailored.projects.some((project) => project.name === projectName),
    ),
    keywordOptimizations: diff.keywordOptimizations.filter((keyword) => tailored.skills.includes(keyword)),
  };
}

function resumeProfileToPdfLines(profile: ResumeProfile, job: JobPosting) {
  return [
    profile.personal.name,
    `${profile.personal.email} | ${profile.personal.phone} | ${profile.personal.location}`,
    "",
    `Tailored Resume for ${job.title} at ${job.company}`,
    "",
    "Summary",
    profile.summary,
    "",
    "Skills",
    profile.skills.join(", "),
    "",
    "Experience",
    ...profile.experience.flatMap((experience) => [
      `${experience.title} - ${experience.company}`,
      ...experience.highlights.map((highlight) => `- ${highlight}`),
    ]),
    "",
    "Projects",
    ...profile.projects.flatMap((project) => [
      project.name,
      project.description,
      `Technologies: ${project.technologies.join(", ")}`,
    ]),
    "",
    "Education",
    ...profile.education.map((education) => `${education.degree} - ${education.institution}`),
  ];
}
