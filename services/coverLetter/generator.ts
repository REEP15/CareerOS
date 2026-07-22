import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";

import { getCoverLetterProvider } from "@/lib/ai";
import { COLLECTIONS, getDb, isFirebaseConfigured } from "@/lib/firebase";
import { createCoverLetterPrompt } from "@/services/coverLetter/prompts";
import { parseCoverLetterResponse } from "@/services/coverLetter/parser";
import { loadPrimaryResumeProfile } from "@/services/matcher/matcher";
import { writeTextPdf } from "@/services/tailoring/pdf";
import type { CoverLetter } from "@/types/coverLetter";
import type { JobPosting } from "@/types/job";
import type { MatchResult } from "@/types/match";
import type { ResumeProfile } from "@/types/resume";

export async function generateCoverLetter(job: JobPosting, match: MatchResult | null) {
  const resume = await loadPrimaryResumeProfile();

  if (!resume) {
    throw new Error("No ResumeProfile found. Upload a resume before generating a cover letter.");
  }

  const generated = await createCoverLetter(resume, job, match);
  await setDoc(doc(getDb(), COLLECTIONS.coverLetters, generated.id), generated);

  return generated;
}

export async function getCoverLetter(jobId: string): Promise<CoverLetter | null> {
  if (!isFirebaseConfigured()) {
    return null;
  }

  const snapshot = await getDoc(doc(getDb(), COLLECTIONS.coverLetters, jobId));
  return snapshot.exists() ? (snapshot.data() as CoverLetter) : null;
}

export async function getCoverLetters(): Promise<CoverLetter[]> {
  if (!isFirebaseConfigured()) {
    return [];
  }

  const snapshot = await getDocs(collection(getDb(), COLLECTIONS.coverLetters));
  return snapshot.docs.map((document) => document.data() as CoverLetter);
}

async function createCoverLetter(resume: ResumeProfile, job: JobPosting, match: MatchResult | null) {
  const provider = getCoverLetterProvider();
  const prompt = createCoverLetterPrompt(resume, job, match);
  const response = provider ? await provider.generateCoverLetter({ prompt, resume, job, match }) : null;
  const parsed = response ? parseCoverLetterResponse(response) : buildFallbackCoverLetter(resume, job, match);
  const content = parsed.content;
  const { pdfUrl } = await writeTextPdf({
    fileName: `${job.id}-cover-letter.pdf`,
    lines: coverLetterToPdfLines(content),
  });

  return {
    id: job.id,
    jobId: job.id,
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
