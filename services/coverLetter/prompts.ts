import type { JobPosting } from "@/types/job";
import type { MatchResult } from "@/types/match";
import type { ResumeProfile } from "@/types/resume";

export function createCoverLetterPrompt(resume: ResumeProfile, job: JobPosting, match: MatchResult | null) {
  return `Generate a one-page cover letter for the supplied ResumeProfile and JobPosting.

Return valid JSON only.
Do not return markdown.
Do not explain outside JSON.

Requirements:
- Company-specific
- Role-specific
- Professional
- ATS-friendly
- Natural tone
- Never fabricate information
- One page maximum

Use this exact JSON shape:
{
  "content": string
}

ResumeProfile:
${JSON.stringify(resume, null, 2)}

JobPosting:
${JSON.stringify(job, null, 2)}

MatchResult:
${JSON.stringify(match, null, 2)}`;
}
