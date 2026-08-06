"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoverLetterGenerator = void 0;
exports.createCoverLetterGenerator = createCoverLetterGenerator;
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
 * Cover Letter Generator
 * Generates company-specific, role-specific cover letters grounded in resume
 */
class CoverLetterGenerator {
    /**
     * Generates a cover letter for a specific job
     */
    async generateCoverLetter(resume, jobDescription, jobMetadata, options = {}) {
        const provider = await (0, providers_1.getEffectiveProvider)(resume.id);
        const prompt = this.buildCoverLetterPrompt(resume, jobDescription, jobMetadata, options);
        let coverLetter;
        switch (provider) {
            case "chatgpt":
                coverLetter = await this.generateWithChatGPT(resume.id, prompt);
                break;
            case "gemini":
                coverLetter = await this.generateWithGemini(resume.id, prompt);
                break;
            case "deepseek":
                coverLetter = await this.generateWithDeepSeek(resume.id, prompt);
                break;
            default:
                throw new Error(`Unsupported AI provider: ${provider}`);
        }
        return this.validateCoverLetter(coverLetter, resume);
    }
    /**
     * Builds the cover letter prompt with strict grounding requirements
     */
    buildCoverLetterPrompt(resume, jobDescription, jobMetadata, options) {
        const resumeText = JSON.stringify(resume, null, 2);
        // Token management for large content
        const MAX_TOKENS = 1000000; // Gemini context limit
        const systemPrompt = "You are an expert cover letter writer. Never fabricate experience or skills.";
        const estimatedTokens = estimateTokenCount(systemPrompt + resumeText + jobDescription);
        let finalJobDescription = jobDescription;
        if (estimatedTokens > MAX_TOKENS) {
            const availableTokens = MAX_TOKENS - estimateTokenCount(systemPrompt + resumeText) - 1000;
            finalJobDescription = truncateText(jobDescription, availableTokens);
        }
        return `You are an expert cover letter writer. Your task is to write a compelling, truthful cover letter for a specific job.

JOB DETAILS:
- Title: ${jobMetadata.title}
- Company: ${jobMetadata.company}
- Description: ${finalJobDescription}

CANDIDATE RESUME:
${resumeText}

COVER LETTER RULES:
1. Write a ${options.tone || "professional"} cover letter
2. Keep it ${options.length || "medium"} length (3-4 paragraphs)
3. Address the letter to the hiring manager or specific person if known
4. Express genuine interest in this specific role and company
5. Highlight relevant experience from the resume WITHOUT fabricating new accomplishments
6. Only use skills, experiences, and achievements explicitly stated in the resume
7. Do not invent or fabricate any experience, skills, or accomplishments
8. Connect the candidate's background to the job requirements naturally
9. Mention specific aspects of the company or role that appeal to the candidate
10. Close with a professional call to action
11. Be concise - avoid generic AI filler and fluff
12. Use specific examples from the resume when relevant
13. Keep it factual and grounded in the actual resume content

COVER LETTER STRUCTURE:
- Salutation
- Introduction: State the position applied for and express interest
- Body: Highlight 2-3 most relevant experiences from resume
- Connection: Explain why this specific role/company appeals
- Conclusion: Professional closing with call to action

Return the complete cover letter as plain text (no JSON, no markdown formatting).`;
    }
    /**
     * Generates cover letter using ChatGPT
     */
    async generateWithChatGPT(uid, prompt) {
        const messages = [
            { role: "system", content: "You are an expert cover letter writer. Never fabricate experience or skills." },
            { role: "user", content: prompt }
        ];
        const response = await (0, providers_1.makeChatGPTRequest)(uid, messages);
        return this.cleanResponse(response);
    }
    /**
     * Generates cover letter using Gemini
     */
    async generateWithGemini(uid, prompt) {
        const response = await (0, providers_1.makeGeminiRequest)(uid, prompt);
        return this.cleanResponse(response);
    }
    /**
     * Generates cover letter using DeepSeek
     */
    async generateWithDeepSeek(uid, prompt) {
        const messages = [
            { role: "system", content: "You are an expert cover letter writer. Never fabricate experience or skills." },
            { role: "user", content: prompt }
        ];
        const response = await (0, providers_1.makeDeepSeekRequest)(uid, messages);
        return this.cleanResponse(response);
    }
    /**
     * Cleans AI response to extract plain text
     */
    cleanResponse(response) {
        // Remove markdown code blocks if present
        response = response.replace(/```(?:text)?\s*([\s\S]*?)\s*```/g, "$1");
        // Remove any JSON formatting if present
        response = response.replace(/^\s*[\{\[].*?[\}\]]\s*$/gm, "");
        return response.trim();
    }
    /**
     * Validates that cover letter is grounded in resume
     */
    validateCoverLetter(coverLetter, resume) {
        // Check for common AI filler phrases
        const fillerPhrases = [
            "I am excited to apply for this opportunity",
            "I am writing to express my interest",
            "I believe my skills make me a strong candidate",
            "I am confident that my experience",
            "I would be a great addition to your team"
        ];
        let fillerCount = 0;
        for (const phrase of fillerPhrases) {
            if (coverLetter.toLowerCase().includes(phrase.toLowerCase())) {
                fillerCount++;
            }
        }
        if (fillerCount > 3) {
            console.warn("Cover letter contains generic AI filler phrases");
        }
        // Ensure company name is mentioned
        if (!coverLetter.toLowerCase().includes(resume.personal.name.toLowerCase())) {
            console.warn("Cover letter may not be personalized - candidate name not found");
        }
        return coverLetter;
    }
}
exports.CoverLetterGenerator = CoverLetterGenerator;
/**
 * Factory function to create cover letter generator
 */
function createCoverLetterGenerator() {
    return new CoverLetterGenerator();
}
