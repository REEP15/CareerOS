import { collection, doc, getDocs, orderBy, query, setDoc, where } from "firebase/firestore";

import { getCoverLetterProvider } from "@/lib/ai";
import { USER_COLLECTIONS, getDb, isFirebaseConfigured } from "@/lib/firebase";
import {
  buildArtifactId,
  buildVersionLabel,
  buildVersionedFileName,
  getNextArtifactVersion,
} from "@/services/artifacts/versioning";
import { createCoverLetterPrompt } from "@/services/coverLetter/prompts";
import { parseCoverLetterResponse } from "@/services/coverLetter/parser";
import { loadPrimaryResumeProfile } from "@/services/matcher/matcher";
import type { CoverLetter } from "@/types/coverLetter";
import type { JobPosting } from "@/types/job";
import type { MatchResult } from "@/types/match";
import type { ResumeProfile } from "@/types/resume";

// Lazy import writeTextPdf to avoid client-side bundling of node:fs/promises
async function getWriteTextPdf() {
  const { writeTextPdf } = await import("@/services/tailoring/pdf");
  return writeTextPdf;
}

export async function generateCoverLetter(uid: string, job: JobPosting, match: MatchResult | null) {
  const resume = await loadPrimaryResumeProfile(uid);

  if (!resume) {
    throw new Error("No ResumeProfile found. Upload a resume before generating a cover letter.");
  }

  const generated = await createCoverLetter(uid, resume, job, match);
  await setDoc(doc(getDb(), `users/${uid}/${USER_COLLECTIONS.coverLetters}`, generated.id), generated);

  return generated;
}

export async function getCoverLetter(uid: string, jobId: string, versionLabel?: string): Promise<CoverLetter | null> {
  if (!isFirebaseConfigured()) {
    return null;
  }

  const versions = await getCoverLetterVersions(uid, jobId);

  if (versionLabel) {
    return versions.find((letter) => letter.versionLabel === versionLabel) ?? null;
  }

  return versions[0] ?? null;
}

export async function getCoverLetterVersions(uid: string, jobId: string): Promise<CoverLetter[]> {
  if (!isFirebaseConfigured()) {
    return [];
  }

  const snapshot = await getDocs(
    query(collection(getDb(), `users/${uid}/${USER_COLLECTIONS.coverLetters}`), where("jobId", "==", jobId), orderBy("version", "desc")),
  );
  return snapshot.docs.map((document) => document.data() as CoverLetter);
}

export async function getCoverLetters(uid: string): Promise<CoverLetter[]> {
  if (!isFirebaseConfigured()) {
    return [];
  }

  const snapshot = await getDocs(collection(getDb(), `users/${uid}/${USER_COLLECTIONS.coverLetters}`));
  const byJobId = new Map<string, CoverLetter>();

  for (const document of snapshot.docs) {
    const coverLetter = document.data() as CoverLetter;
    const existing = byJobId.get(coverLetter.jobId);

    if (!existing || coverLetter.version > existing.version) {
      byJobId.set(coverLetter.jobId, coverLetter);
    }
  }

  return [...byJobId.values()];
}

async function createCoverLetter(uid: string, resume: ResumeProfile, job: JobPosting, match: MatchResult | null) {
  const version = await getNextArtifactVersion(uid, job.id, USER_COLLECTIONS.coverLetters);
  const versionLabel = buildVersionLabel(version);
  const provider = getCoverLetterProvider();
  const prompt = createCoverLetterPrompt(resume, job, match);
  const response = provider ? await provider.generateCoverLetter({ prompt, resume, job, match }) : null;
  const parsed = response ? parseCoverLetterResponse(response) : buildFallbackCoverLetter(resume, job, match);
  const content = parsed.content;
  const writeTextPdf = await getWriteTextPdf();
  const { pdfUrl } = await writeTextPdf({
    fileName: buildVersionedFileName(job.id, "cover-letter", version),
    lines: coverLetterToPdfLines(content),
  });

  return {
    id: buildArtifactId(job.id, version),
    jobId: job.id,
    version,
    versionLabel,
    company: job.company,
    role: job.title,
    content,
    pdfUrl,
    createdAt: new Date().toISOString(),
  } satisfies CoverLetter;
}

function buildFallbackCoverLetter(resume: ResumeProfile, job: JobPosting, match: MatchResult | null) {
  const topSkills = resume.skills.slice(0, 4).join(", ");
  const strongestEvidence = resume.experience[0]
    ? `${resume.experience[0].title} experience at ${resume.experience[0].company}`
    : "hands-on project experience";
  const matchReason = match?.strengths[0] ?? `alignment with ${job.title} responsibilities`;

  return {
    content: [
      `Dear ${job.company} Hiring Team,`,
      "",
      `I am writing to apply for the ${job.title} role. My background includes ${strongestEvidence}, and my profile aligns with this opportunity through ${matchReason}.`,
      "",
      `I can bring practical experience across ${topSkills || "modern product engineering"}, along with a disciplined approach to shipping maintainable, user-focused software. I have tailored my resume for this role by emphasizing the skills and projects most relevant to ${job.company}'s needs.`,
      "",
      "I would welcome the opportunity to discuss how my experience can contribute to your team. Thank you for your time and consideration.",
      "",
      "Sincerely,",
      resume.personal.name,
    ].join("\n"),
  };
}

function coverLetterToPdfLines(content: string) {
  return content.split("\n");
}
