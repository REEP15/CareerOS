import { z } from "zod";
import type { Certification } from "@/shared/types/resume";

const personalSchema = z.object({
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  location: z.string(),
  linkedin: z.string().optional(),
  github: z.string().optional(),
  portfolio: z.string().optional(),
});

const experienceSchema = z.object({
  company: z.string(),
  title: z.string(),
  location: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  highlights: z.array(z.string()),
  bulletPoints: z.array(z.string()).optional(),
  technologies: z.array(z.string()).optional(),
});

const projectSchema = z.object({
  name: z.string(),
  description: z.string(),
  technologies: z.array(z.string()),
  link: z.string().optional(),
  bulletPoints: z.array(z.string()).optional(),
});

const educationSchema = z.object({
  institution: z.string(),
  degree: z.string(),
  fieldOfStudy: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  location: z.string().optional(),
  startYear: z.string().optional(),
  endYear: z.string().optional(),
  cgpa: z.string().optional(),
  percentage: z.string().optional(),
  board: z.string().optional(),
  school: z.string().optional(),
});

const certificationSchema = z.object({
  title: z.string(),
  organization: z.string().optional(),
  dates: z.string().optional(),
  bulletPoints: z.array(z.string()).optional(),
});

const resumeProfileSchema = z.object({
  id: z.string(),
  personal: personalSchema,
  summary: z.string(),
  skills: z.array(z.string()),
  experience: z.array(experienceSchema),
  projects: z.array(projectSchema),
  education: z.array(educationSchema),
  certifications: z.array(z.union([certificationSchema, z.string()])),
  preferredRoles: z.array(z.string()),
  preferredLocations: z.array(z.string()),
  updatedAt: z.string(),
});

const tailoredResumeResponseSchema = z.object({
  profile: resumeProfileSchema,
  diff: z.object({
    summary: z.object({
      before: z.string(),
      after: z.string(),
    }),
    skills: z.object({
      before: z.array(z.string()),
      after: z.array(z.string()),
    }),
    prioritizedProjects: z.array(z.string()).catch([]),
    keywordOptimizations: z.array(z.string()).catch([]),
  }),
});

export function parseTailoredResumeResponse(raw: string) {
  const parsedJson = JSON.parse(extractJsonObject(raw));
  const parsed = tailoredResumeResponseSchema.parse(parsedJson);
  
  // Convert certifications from string to Certification format if needed
  const profile = {
    ...parsed.profile,
    certifications: parsed.profile.certifications.map(cert => 
      typeof cert === 'string' ? { title: cert } : cert
    ) as Certification[]
  };
  
  return {
    ...parsed,
    profile
  };
}

function extractJsonObject(raw: string) {
  const trimmed = raw.trim();
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || firstBrace >= lastBrace) {
    throw new Error("Tailored resume response did not contain a valid JSON object.");
  }

  return trimmed.slice(firstBrace, lastBrace + 1);
}
