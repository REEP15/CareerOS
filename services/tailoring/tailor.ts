import { collection, doc, getDocs, orderBy, query, setDoc, where } from "firebase/firestore";

import { getResumeTailoringProvider } from "@/lib/ai";
import { USER_COLLECTIONS, getDb, isFirebaseConfigured } from "@/lib/firebase";
import {
  buildArtifactId,
  buildVersionLabel,
  buildVersionedFileName,
  getNextArtifactVersion,
} from "@/services/artifacts/versioning";
import { loadPrimaryResumeProfile } from "@/services/matcher/matcher";
import { parseTailoredResumeResponse } from "@/services/tailoring/parser";
import { createResumeTailoringPrompt } from "@/services/tailoring/prompts";
import type { JobPosting } from "@/types/job";
import type { MatchResult } from "@/types/match";
import type { ResumeProfile } from "@/types/resume";
import type { ResumeDiff, TailoredResume } from "@/types/tailoredResume";

// Lazy import writeTextPdf to avoid client-side bundling of node:fs/promises
async function getWriteTextPdf() {
  const { writeTextPdf } = await import("@/services/tailoring/pdf");
  return writeTextPdf;
}

export async function generateTailoredResume(uid: string, job: JobPosting, match: MatchResult | null) {
  const resume = await loadPrimaryResumeProfile(uid);

  if (!resume) {
    throw new Error("No ResumeProfile found. Upload a resume before tailoring.");
  }

  const generated = await createTailoredResume(uid, resume, job, match);
  await setDoc(doc(getDb(), `users/${uid}/${USER_COLLECTIONS.tailoredResumes}`, generated.id), generated);

  return generated;
}

export async function getTailoredResume(uid: string, jobId: string, versionLabel?: string): Promise<TailoredResume | null> {
  if (!isFirebaseConfigured()) {
    return null;
  }

  if (versionLabel) {
    const versions = await getTailoredResumeVersions(uid, jobId);
    return versions.find((resume) => resume.versionLabel === versionLabel) ?? null;
  }

  const versions = await getTailoredResumeVersions(uid, jobId);
  return versions[0] ?? null;
}

export async function getTailoredResumeVersions(uid: string, jobId: string): Promise<TailoredResume[]> {
  if (!isFirebaseConfigured()) {
    return [];
  }

  const snapshot = await getDocs(
    query(collection(getDb(), `users/${uid}/${USER_COLLECTIONS.tailoredResumes}`), where("jobId", "==", jobId), orderBy("version", "desc")),
  );
  return snapshot.docs.map((document) => document.data() as TailoredResume);
}

export async function getTailoredResumes(uid: string): Promise<TailoredResume[]> {
  if (!isFirebaseConfigured()) {
    return [];
  }

  const snapshot = await getDocs(collection(getDb(), `users/${uid}/${USER_COLLECTIONS.tailoredResumes}`));
  const byJobId = new Map<string, TailoredResume>();

  for (const document of snapshot.docs) {
    const resume = document.data() as TailoredResume;
    const existing = byJobId.get(resume.jobId);

    if (!existing || resume.version > existing.version) {
      byJobId.set(resume.jobId, resume);
    }
  }

  return [...byJobId.values()];
}

async function createTailoredResume(uid: string, resume: ResumeProfile, job: JobPosting, match: MatchResult | null) {
  const version = await getNextArtifactVersion(uid, job.id, USER_COLLECTIONS.tailoredResumes);
  const versionLabel = buildVersionLabel(version);
  const provider = getResumeTailoringProvider();
  const prompt = createResumeTailoringPrompt(resume, job, match);
  const response = provider ? await provider.tailorResume({ prompt, resume, job, match }) : null;
  const parsed = response ? parseTailoredResumeResponse(response) : buildFallbackTailoredResume(resume, job, match);
  const profile = enforceNoFabrication(resume, parsed.profile);
  const diff = normalizeDiff(resume, profile, parsed.diff);
  const writeTextPdf = await getWriteTextPdf();
  const { pdfUrl } = await writeTextPdf({
    fileName: buildVersionedFileName(job.id, "resume", version),
    lines: resumeProfileToPdfLines(profile, job),
  });

  return {
    id: buildArtifactId(job.id, version),
    jobId: job.id,
    version,
    versionLabel,
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
