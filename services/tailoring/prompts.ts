import type { JobPosting } from "@/shared/types/job";
import type { MatchResult } from "@/shared/types/match";
import type { ResumeProfile } from "@/shared/types/resume";

export function createResumeTailoringPrompt(resume: ResumeProfile, job: JobPosting, match: MatchResult | null) {
  return `Tailor the supplied ResumeProfile for the supplied JobPosting.

Return valid JSON only.
Do not return markdown.
Do not explain outside JSON.

Allowed changes:
- Rewrite summary
- Reorder skills
- Prioritize relevant projects
- Optimize ATS keywords
- Improve wording

Forbidden:
- Invent experience
- Invent projects
- Invent companies
- Invent dates
- Invent certifications
- Invent skills

Use this exact JSON shape:
{
  "profile": ResumeProfile,
  "diff": {
    "summary": { "before": string, "after": string },
    "skills": { "before": string[], "after": string[] },
    "prioritizedProjects": string[],
    "keywordOptimizations": string[]
  }
}

ResumeProfile:
${JSON.stringify(resume, null, 2)}

JobPosting:
${JSON.stringify(job, null, 2)}

MatchResult:
${JSON.stringify(match, null, 2)}`;
}
