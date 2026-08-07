"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseMatchResponse = parseMatchResponse;
const zod_1 = require("zod");
const matchResponseSchema = zod_1.z.object({
    confidence: zod_1.z.number().min(0).max(100).catch(0),
    skillsScore: zod_1.z.number().min(0).max(100).catch(0),
    experienceScore: zod_1.z.number().min(0).max(100).catch(0),
    educationScore: zod_1.z.number().min(0).max(100).catch(0),
    locationScore: zod_1.z.number().min(0).max(100).catch(0),
    salaryScore: zod_1.z.number().min(0).max(100).catch(0),
    resumePassProbability: zod_1.z.number().min(0).max(100).catch(0),
    interviewProbability: zod_1.z.number().min(0).max(100).catch(0),
    strengths: zod_1.z.array(zod_1.z.string().trim()).catch([]),
    weaknesses: zod_1.z.array(zod_1.z.string().trim()).catch([]),
    missingSkills: zod_1.z.array(zod_1.z.string().trim()).catch([]),
    reasoning: zod_1.z.string().trim().min(1).catch("No reasoning provided."),
    recommended: zod_1.z.boolean().catch(false),
});
function parseMatchResponse(raw) {
    const parsedJson = JSON.parse(extractJsonObject(raw));
    return matchResponseSchema.parse(parsedJson);
}
function extractJsonObject(raw) {
    const trimmed = raw.trim();
    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1 || firstBrace >= lastBrace) {
        throw new Error("Matcher response did not contain a valid JSON object.");
    }
    return trimmed.slice(firstBrace, lastBrace + 1);
}
