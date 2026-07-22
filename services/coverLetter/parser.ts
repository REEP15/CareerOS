import { z } from "zod";

const coverLetterResponseSchema = z.object({
  content: z.string().trim().min(100).max(4000),
});

export function parseCoverLetterResponse(raw: string) {
  const parsedJson = JSON.parse(extractJsonObject(raw));
  return coverLetterResponseSchema.parse(parsedJson);
}

function extractJsonObject(raw: string) {
  const trimmed = raw.trim();
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || firstBrace >= lastBrace) {
    throw new Error("Cover letter response did not contain a valid JSON object.");
  }

  return trimmed.slice(firstBrace, lastBrace + 1);
}
