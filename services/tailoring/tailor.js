"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResumeTailor = void 0;
exports.createResumeTailor = createResumeTailor;
exports.generateTailoredResume = generateTailoredResume;
exports.getTailoredResumeVersions = getTailoredResumeVersions;
const providers_1 = require("@/services/ai/providers");
/**
 * Token management (reused from Phase 1)
 */
function estimateTokenCount(text) {
    return Math.ceil(text.length / 4);
}
function truncateText(text, maxTokens) {
    const estimatedTokens = estimateTokenCount(text);
    if (estimatedTokens <= maxTokens) {
        return text;
    }
    const ratio = maxTokens / estimatedTokens;
    const maxLength = Math.floor(text.length * ratio);
    return text.slice(0, maxLength) + "\n\n[Content truncated due to length]";
}
/**
 * Resume Tailoring Engine
 * Optimizes resume for specific job while maintaining factual accuracy
 */
class ResumeTailor {
    /**
     * Tailors a resume for a specific job description
     */
    async tailorResume(resume, jobDescription, jobMetadata, options = {}) {
        const provider = await (0, providers_1.getEffectiveProvider)(resume.id); // Use resume.id as user ID context
        const prompt = this.buildTailoringPrompt(resume, jobDescription, jobMetadata, options);
        let tailoredContent;
        switch (provider) {
            case "chatgpt":
                tailoredContent = await this.tailorWithChatGPT(resume.id, prompt);
                break;
            case "gemini":
                tailoredContent = await this.tailorWithGemini(resume.id, prompt);
                break;
            case "deepseek":
                tailoredContent = await this.tailorWithDeepSeek(resume.id, prompt);
                break;
            default:
                throw new Error(`Unsupported AI provider: ${provider}`);
        }
        return this.validateTailoredResume(tailoredContent, resume);
    }
    /**
     * Builds the tailoring prompt with strict grounding requirements
     */
    buildTailoringPrompt(resume, jobDescription, jobMetadata, options) {
        const resumeText = JSON.stringify(resume, null, 2);
        // Token management for large content
        const MAX_TOKENS = 1000000; // Gemini context limit
        const systemPrompt = "You are an expert resume tailoring specialist. Never fabricate resume content.";
        const estimatedTokens = estimateTokenCount(systemPrompt + resumeText + jobDescription);
        let finalJobDescription = jobDescription;
        if (estimatedTokens > MAX_TOKENS) {
            const availableTokens = MAX_TOKENS - estimateTokenCount(systemPrompt + resumeText) - 1000;
            finalJobDescription = truncateText(jobDescription, availableTokens);
        }
        return `You are an expert resume tailoring specialist. Your task is to optimize a resume for a specific job while maintaining absolute factual accuracy.

JOB DETAILS:
- Title: ${jobMetadata.title}
- Company: ${jobMetadata.company}
- Description: ${finalJobDescription}

ORIGINAL RESUME:
${resumeText}

TAILORING RULES:
1. NEVER invent, hallucinate, or fabricate any experience, skills, projects, certifications, employers, dates, metrics, technologies, or accomplishments
2. Only use information explicitly present in the original resume
3. You MAY reorder sections to highlight most relevant experience
4. You MAY rewrite bullet points to improve clarity and impact without changing meaning
5. You MAY compress content to fit within length limits while preserving all facts
6. You MAY expand on existing accomplishments with more detail if space allows
7. You MAY emphasize relevant experience for the target role
8. You MAY improve ATS keyword alignment naturally by using terminology from the job description
9. You MUST preserve all dates, companies, titles, technologies, and metrics exactly as stated
10. You MUST NOT add any new skills, experiences, or certifications not in the original resume
11. You MUST NOT change any dates or employment timelines
12. You MUST NOT fabricate metrics or accomplishments
13. Return the complete tailored resume as JSON with the same structure as the input

OPTIMIZATION OPTIONS:
${options.optimizeForATS ? "- Optimize for ATS keyword coverage using job description terminology" : ""}
${options.emphasizeRecentExperience ? "- Emphasize most recent experience" : ""}
${options.compressContent ? "- Compress content for conciseness while preserving all facts" : ""}
${options.targetKeywords ? `- Target keywords: ${options.targetKeywords.join(", ")}` : ""}

Return a valid JSON object matching the original resume structure with the tailored content.`;
    }
    /**
     * Tailors resume using ChatGPT
     */
    async tailorWithChatGPT(uid, prompt) {
        const messages = [
            { role: "system", content: "You are an expert resume tailoring specialist. Never fabricate resume content." },
            { role: "user", content: prompt }
        ];
        const response = await (0, providers_1.makeChatGPTRequest)(uid, messages);
        return this.extractJSONFromResponse(response);
    }
    /**
     * Tailors resume using Gemini
     */
    async tailorWithGemini(uid, prompt) {
        const response = await (0, providers_1.makeGeminiRequest)(uid, prompt);
        return this.extractJSONFromResponse(response);
    }
    /**
     * Tailors resume using DeepSeek
     */
    async tailorWithDeepSeek(uid, prompt) {
        const messages = [
            { role: "system", content: "You are an expert resume tailoring specialist. Never fabricate resume content." },
            { role: "user", content: prompt }
        ];
        const response = await (0, providers_1.makeDeepSeekRequest)(uid, messages);
        return this.extractJSONFromResponse(response);
    }
    /**
     * Extracts JSON from AI response
     */
    extractJSONFromResponse(response) {
        // Try to parse as-is first
        try {
            return JSON.parse(response);
        }
        catch {
            // Try to extract JSON from markdown code blocks
            const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[1]);
            }
            // Try to find JSON object in response
            const objectMatch = response.match(/\{[\s\S]*\}/);
            if (objectMatch) {
                return JSON.parse(objectMatch[0]);
            }
            throw new Error("Could not extract JSON from AI response");
        }
    }
    /**
     * Validates that tailored resume is grounded in original resume
     */
    validateTailoredResume(tailored, original) {
        // Validate that all companies match
        const originalCompanies = new Set(original.experience.map(e => e.company.toLowerCase()));
        const tailoredCompanies = new Set(tailored.experience.map((e) => e.company.toLowerCase()));
        if (!this.isSubset(tailoredCompanies, originalCompanies)) {
            throw new Error("Tailored resume contains companies not in original resume");
        }
        // Validate that all titles match
        const originalTitles = new Set(original.experience.map(e => e.title.toLowerCase()));
        const tailoredTitles = new Set(tailored.experience.map((e) => e.title.toLowerCase()));
        if (!this.isSubset(tailoredTitles, originalTitles)) {
            throw new Error("Tailored resume contains job titles not in original resume");
        }
        // Validate that no new skills were added
        const originalSkills = new Set(original.skills.map(s => s.toLowerCase()));
        const tailoredSkills = new Set(tailored.skills.map((s) => s.toLowerCase()));
        if (!this.isSubset(tailoredSkills, originalSkills)) {
            throw new Error("Tailored resume contains skills not in original resume");
        }
        // Validate that dates match
        for (const tailoredExp of tailored.experience) {
            const originalExp = original.experience.find(e => e.company.toLowerCase() === tailoredExp.company.toLowerCase() &&
                e.title.toLowerCase() === tailoredExp.title.toLowerCase());
            if (originalExp) {
                if (originalExp.startDate !== tailoredExp.startDate || originalExp.endDate !== tailoredExp.endDate) {
                    throw new Error("Tailored resume changed employment dates");
                }
            }
        }
        return tailored;
    }
    /**
     * Checks if set B is a subset of set A
     */
    isSubset(setB, setA) {
        for (const item of setB) {
            if (!setA.has(item)) {
                return false;
            }
        }
        return true;
    }
}
exports.ResumeTailor = ResumeTailor;
/**
 * Factory function to create resume tailor
 */
function createResumeTailor() {
    return new ResumeTailor();
}
/**
 * Public API functions for existing code compatibility
 */
async function generateTailoredResume(resume, jobDescription, jobMetadata, options) {
    const tailor = createResumeTailor();
    return tailor.tailorResume(resume, jobDescription, jobMetadata, options);
}
async function getTailoredResumeVersions(userId, jobId) {
    // Placeholder for future functionality to retrieve version history
    return [];
}
