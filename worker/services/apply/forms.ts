import type { ResumeProfile } from "@/types/resume";

export type KnownField = {
  labels: string[];
  value: string | undefined;
};

function splitName(name: string): { firstName?: string; lastName?: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0],
    lastName: parts.length > 1 ? parts.slice(1).join(" ") : undefined,
  };
}

function splitLocation(location: string): { city?: string; state?: string; country?: string } {
  const parts = location
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 1) {
    return { city: parts[0] };
  }

  if (parts.length === 2) {
    return { city: parts[0], country: parts[1] };
  }

  if (parts.length > 2) {
    return {
      city: parts[0],
      state: parts.slice(1, -1).join(", "),
      country: parts[parts.length - 1],
    };
  }

  return {};
}

export const KNOWN_FIELDS = {
  firstName: ["first name", "given name"],
  lastName: ["last name", "family name", "surname"],
  fullName: ["name", "full name", "candidate name"],
  email: ["email", "email address"],
  phone: ["phone", "phone number", "mobile"],
  linkedin: ["linkedin", "linkedin profile"],
  github: ["github", "github profile"],
  portfolio: ["portfolio", "website", "personal website"],
  city: ["city"],
  state: ["state", "province", "region"],
  country: ["country"],
};

export function getKnownApplicationFields(resume: ResumeProfile): KnownField[] {
  const name = splitName(resume.personal.name);
  const location = splitLocation(resume.personal.location);

  return [
    {
      labels: KNOWN_FIELDS.firstName,
      value: name.firstName,
    },
    {
      labels: KNOWN_FIELDS.lastName,
      value: name.lastName,
    },
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
    {
      labels: KNOWN_FIELDS.city,
      value: location.city,
    },
    {
      labels: KNOWN_FIELDS.state,
      value: location.state,
    },
    {
      labels: KNOWN_FIELDS.country,
      value: location.country,
    },
  ];
}
