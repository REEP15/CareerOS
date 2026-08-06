import type { ResumeProfile } from "@/types/resume";

export type KnownField = {
  labels: string[];
  value: string | undefined;
};

export const KNOWN_FIELDS = {
  fullName: ["name", "full name", "candidate name"],
  email: ["email", "email address"],
  phone: ["phone", "phone number", "mobile"],
  linkedin: ["linkedin", "linkedin profile"],
  github: ["github", "github profile"],
  portfolio: ["portfolio", "website", "personal website"],
};

export function getKnownApplicationFields(resume: ResumeProfile): KnownField[] {
  return [
    {
      labels: KNOWN_FIELDS.fullName,
      value: resume.personal.name,
    },
    {
      labels: KNOWN_FIELDS.email,
      value: resume.personal.email,
    },
    {
      labels: KNOWN_FIELDS.phone,
      value: resume.personal.phone,
    },
    {
      labels: KNOWN_FIELDS.linkedin,
      value: resume.personal.linkedin,
    },
    {
      labels: KNOWN_FIELDS.github,
      value: resume.personal.github,
    },
    {
      labels: KNOWN_FIELDS.portfolio,
      value: resume.personal.portfolio,
    },
  ];
}
