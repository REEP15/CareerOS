/**
 * Answer resolver for automation
 * Maps CareerOS ResumeProfile to automation answers
 * Mirrors v0_phase3/generic/answer-resolver.ts with CareerOS data model integration
 */

import type {
  DetectedField,
  FieldOption,
  ResolvedAnswer,
} from "@/types/automation";
import { SENSITIVE_SEMANTICS } from "./field-classifier";
import type { ResumeProfile } from "@/types/resume";

export interface ResumeVersion {
  id: string;
  label: string;
  fileRef: string;
  fileName: string;
  contentType: string;
}

export interface CoverLetterVersion {
  id: string;
  label: string;
  fileRef?: string;
  fileName?: string;
  contentType?: string;
  bodyText?: string;
}

export interface UserProfile {
  userId: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  address?: {
    line1?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  links?: {
    linkedin?: string;
    portfolio?: string;
    github?: string;
    website?: string;
  };
  workAuthorization?: {
    status?: string;
    authorizedToWork?: boolean;
    requiresSponsorship?: boolean;
  };
  experience?: {
    yearsOfExperience?: number;
    currentCompany?: string;
    currentTitle?: string;
    expectedSalary?: string;
    noticePeriod?: string;
  };
  customAnswers?: Record<string, string>;
}

export interface ResolverInputs {
  profile: UserProfile;
  resume: ResumeVersion;
  coverLetter?: CoverLetterVersion;
  resumePath: string;
  coverLetterPath?: string;
}

function parseLocation(location: string): Pick<NonNullable<UserProfile["address"]>, "city" | "state" | "country"> {
  const parts = location
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return {};
  }

  if (parts.length === 1) {
    return { city: parts[0] };
  }

  if (parts.length === 2) {
    return { city: parts[0], country: parts[1] };
  }

  return {
    city: parts[0],
    state: parts.slice(1, -1).join(", "),
    country: parts[parts.length - 1],
  };
}

function pickBooleanOption(options: FieldOption[] | undefined, want: boolean): FieldOption | undefined {
  if (!options) return undefined;
  const yes = /\b(yes|true|i (am|do)|authorized|eligible)\b/i;
  const no = /\b(no|false|not|un(authorized|eligible))\b/i;
  return options.find((o) => (want ? yes : no).test(`${o.label} ${o.value}`));
}

function match(option: FieldOption[] | undefined, value: string): string | undefined {
  if (!option) return value;
  const lower = value.toLowerCase();
  const exact = option.find(
    (o) => o.value.toLowerCase() === lower || o.label.toLowerCase() === lower,
  );
  if (exact) return exact.value;
  const partial = option.find((o) => o.label.toLowerCase().includes(lower));
  return partial?.value;
}

export function mapResumeProfileToUserProfile(resume: ResumeProfile, userId: string): UserProfile {
  const experience = resume.experience[0] ?? ({} as ResumeProfile["experience"][number]);
  const location = parseLocation(resume.personal.location);
  const totalYears = resume.experience.reduce((acc, exp) => {
    if (!exp.startDate) return acc;
    const start = new Date(exp.startDate);
    const end = exp.endDate ? new Date(exp.endDate) : new Date();
    const years = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);
    return acc + years;
  }, 0);

  return {
    userId,
    firstName: resume.personal.name.split(" ")[0],
    lastName: resume.personal.name.split(" ").slice(1).join(" "),
    fullName: resume.personal.name,
    email: resume.personal.email,
    phone: resume.personal.phone,
    address: {
      line1: undefined,
      city: location.city,
      state: location.state,
      country: location.country,
      postalCode: undefined,
    },
    links: {
      linkedin: resume.personal.linkedin,
      portfolio: resume.personal.portfolio,
      github: resume.personal.github,
      website: undefined,
    },
    workAuthorization: {
      status: undefined,
      authorizedToWork: undefined,
      requiresSponsorship: undefined,
    },
    experience: {
      yearsOfExperience: Math.round(totalYears),
      currentCompany: experience.company,
      currentTitle: experience.title,
      expectedSalary: undefined,
      noticePeriod: undefined,
    },
    customAnswers: {},
  };
}

export function resolveAnswer(field: DetectedField, inputs: ResolverInputs): ResolvedAnswer | null {
  const { profile, resume, coverLetter, resumePath, coverLetterPath } = inputs;
  const p = profile;

  if (SENSITIVE_SEMANTICS.has(field.semantic)) return null;

  const base = {
    fieldId: field.id,
    semantic: field.semantic,
  };

  const cap = field.classificationConfidence;
  const conf = (raw: number) => Math.min(raw, cap);

  const text = (
    value: string | undefined,
    confidence: number,
    rationale: string,
    source: ResolvedAnswer["source"] = "profile",
  ): ResolvedAnswer | null =>
    value
      ? { ...base, value, confidence: conf(confidence), source, rationale }
      : null;

  switch (field.semantic) {
    case "full_name":
      return text(
        p.fullName ?? ([p.firstName, p.lastName].filter(Boolean).join(" ") || undefined),
        0.95,
        "Full name from profile",
      );
    case "first_name":
      return text(p.firstName, 0.95, "First name from profile");
    case "last_name":
      return text(p.lastName, 0.95, "Last name from profile");
    case "email":
      return text(p.email, 0.97, "Email from profile");
    case "phone":
      return text(p.phone, 0.95, "Phone from profile");
    case "address_line":
      return text(p.address?.line1, 0.9, "Street address from profile");
    case "city":
      return text(p.address?.city, 0.9, "City from profile");
    case "state":
      return text(p.address?.state, 0.9, "State from profile");
    case "country":
      return text(p.address?.country, 0.9, "Country from profile");
    case "postal_code":
      return text(p.address?.postalCode, 0.9, "Postal code from profile");
    case "linkedin_url":
      return text(p.links?.linkedin, 0.9, "LinkedIn URL from profile");
    case "portfolio_url":
      return text(p.links?.portfolio, 0.9, "Portfolio URL from profile");
    case "github_url":
      return text(p.links?.github, 0.9, "GitHub URL from profile");
    case "website_url":
      return text(p.links?.website, 0.85, "Website URL from profile");
    case "current_company":
      return text(p.experience?.currentCompany, 0.85, "Current company from profile");
    case "current_title":
      return text(p.experience?.currentTitle, 0.85, "Current title from profile");
    case "expected_salary":
      return text(p.experience?.expectedSalary, 0.8, "Expected salary from profile");
    case "notice_period":
      return text(p.experience?.noticePeriod, 0.8, "Notice period from profile");
    case "years_of_experience": {
      const years = p.experience?.yearsOfExperience;
      if (years == null) return null;
      return { ...base, value: String(years), confidence: conf(0.85), source: "profile", rationale: "Years of experience from profile" };
    }
    case "resume_upload":
      return {
        ...base,
        filePath: resumePath,
        confidence: conf(0.97),
        source: "resume_version",
        rationale: `Selected resume version "${resume.label}"`,
      };
    case "cover_letter_upload":
      if (!coverLetter || !coverLetterPath) return null;
      return {
        ...base,
        filePath: coverLetterPath,
        confidence: conf(0.95),
        source: "cover_letter_version",
        rationale: `Selected cover letter "${coverLetter.label}"`,
      };
    case "cover_letter_text":
      if (!coverLetter?.bodyText) return null;
      return {
        ...base,
        value: coverLetter.bodyText,
        confidence: conf(0.9),
        source: "cover_letter_version",
        rationale: `Cover letter body from "${coverLetter.label}"`,
      };
    case "work_authorization": {
      const status = p.workAuthorization?.status;
      if (field.options?.length) {
        const chosen = status ? match(field.options, status) : undefined;
        if (!chosen) return null;
        return { ...base, optionValue: chosen, confidence: conf(0.75), source: "profile", rationale: "Work authorization status from profile" };
      }
      return text(status, 0.8, "Work authorization status from profile");
    }
    case "requires_sponsorship": {
      const requires = p.workAuthorization?.requiresSponsorship;
      if (requires == null) return null;
      if (field.kind === "checkbox") {
        return { ...base, checked: requires, confidence: conf(0.85), source: "profile", rationale: "Sponsorship requirement from profile" };
      }
      const opt = pickBooleanOption(field.options, requires);
      if (field.options?.length && !opt) return null;
      return {
        ...base,
        optionValue: opt?.value,
        value: opt ? undefined : requires ? "Yes" : "No",
        confidence: conf(0.85),
        source: "profile",
        rationale: "Sponsorship requirement from profile",
      };
    }
    case "how_did_you_hear": {
      const saved = p.customAnswers?.["how_did_you_hear"];
      if (!saved) return null;
      const chosen = field.options?.length ? match(field.options, saved) : undefined;
      if (field.options?.length && !chosen) return null;
      return {
        ...base,
        optionValue: chosen,
        value: chosen ? undefined : saved,
        confidence: conf(0.7),
        source: "custom_answer",
        rationale: "Saved custom answer",
      };
    }
    default: {
      const key = normalizeKey(field.signals.labelText ?? field.signals.ariaLabel ?? "");
      const saved = key ? p.customAnswers?.[key] : undefined;
      if (!saved) return null;
      return {
        ...base,
        value: saved,
        confidence: conf(0.65),
        source: "custom_answer",
        rationale: "Matched a saved custom answer",
      };
    }
  }
}

function normalizeKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
