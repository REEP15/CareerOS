import { z } from "zod";

const matchResponseSchema = z.object({
  confidence: z.number().min(0).max(100).catch(0),
  skillsScore: z.number().min(0).max(100).catch(0),
  experienceScore: z.number().min(0).max(100).catch(0),
  educationScore: z.number().min(0).max(100).catch(0),
  locationScore: z.number().min(0).max(100).catch(0),
  salaryScore: z.number().min(0).max(100).catch(0),
  strengths: z.array(z.string().trim()).catch([]),
  weaknesses: z.array(z.string().trim()).catch([]),
  missingSkills: z.array(z.string().trim()).catch([]),
  reasoning: z.string().trim().min(1).catch("No reasoning provided."),
  recommended: z.boolean().catch(false),
});

export type ParsedMatchEvaluation = z.infer<typeof matchResponseSchema>;

export function parseMatchResponse(raw: string) {
  const parsedJson = JSON.parse(extractJsonObject(raw));
  return matchResponseSchema.parse(parsedJson);
}

function extractJsonObject(raw: string) {
  const trimmed = raw.trim();
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || firstBrace >= lastBrace) {
    throw new Error("Matcher response did not contain a valid JSON object.");
  }

  return trimmed.slice(firstBrace, lastBrace + 1);
}
