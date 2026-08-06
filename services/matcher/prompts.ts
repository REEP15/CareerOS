import type { JobPosting } from "@/shared/types/job";
import type { ResumeProfile } from "@/shared/types/resume";

export function createJobMatchPrompt(resume: ResumeProfile, job: JobPosting) {
  return `Compare the supplied ResumeProfile and JobPosting.

Evaluate:
- Skills
- Experience
- Education
- Location
- Salary

Return valid JSON only.
Do not return markdown.
Do not explain outside JSON.

Use this exact JSON shape:
{
  "confidence": number,
  "skillsScore": number,
  "experienceScore": number,
  "educationScore": number,
  "locationScore": number,
  "salaryScore": number,
  "strengths": string[],
  "weaknesses": string[],
  "missingSkills": string[],
  "reasoning": string,
  "recommended": boolean
}

Rules:
- Every score must be between 0 and 100.
- Keep strengths, weaknesses, and missingSkills concise.
- reasoning must be a short paragraph.

ResumeProfile:
${JSON.stringify(resume, null, 2)}

JobPosting:
${JSON.stringify(job, null, 2)}`;
}
