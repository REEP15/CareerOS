import type { ResumeProfile } from "@/types/resume";

export type KnownField = {
  labels: string[];
  value: string | undefined;
};

export function getKnownApplicationFields(resume: ResumeProfile): KnownField[] {
  return [
    {
      labels: ["name", "full name", "candidate name"],
      value: resume.personal.name,
    },
    {
      labels: ["email", "email address"],
      value: resume.personal.email,
    },
    {
      labels: ["phone", "phone number", "mobile"],
      value: resume.personal.phone,
    },
    {
      labels: ["linkedin", "linkedin profile"],
      value: resume.personal.linkedin,
    },
    {
      labels: ["github", "github profile"],
      value: resume.personal.github,
    },
    {
      labels: ["portfolio", "website", "personal website"],
      value: resume.personal.portfolio,
    },
  ];
}
