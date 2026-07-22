import { z } from "zod";

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
});

const projectSchema = z.object({
  name: z.string(),
  description: z.string(),
  technologies: z.array(z.string()),
  link: z.string().optional(),
});

const educationSchema = z.object({
  institution: z.string(),
  degree: z.string(),
  fieldOfStudy: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

const resumeProfileSchema = z.object({
  id: z.string(),
  personal: personalSchema,
  summary: z.string(),
  skills: z.array(z.string()),
  experience: z.array(experienceSchema),
  projects: z.array(projectSchema),
  education: z.array(educationSchema),
  certifications: z.array(z.string()),
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
  return tailoredResumeResponseSchema.parse(parsedJson);
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
