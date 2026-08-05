import { getEffectiveProvider, makeChatGPTRequest, makeGeminiRequest, makeDeepSeekRequest } from "@/services/ai/providers";
import type { ResumeProfile } from "@/types/resume";
import type { ATSAnalysisOptions } from "@/types/application";

/**
 * Token management (reused from Phase 1)
 */
function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

function truncateText(text: string, maxTokens: number): string {
  const estimatedTokens = estimateTokenCount(text);
  if (estimatedTokens <= maxTokens) {
    return text;
  }
  
  const ratio = maxTokens / estimatedTokens;
  const maxLength = Math.floor(text.length * ratio);
  return text.slice(0, maxLength) + "\n\n[Content truncated due to length]";
}

/**
 * ATS Analysis Results
 */
export interface ATSAnalysis {
  originalScore: number;
  tailoredScore: number;
  keywordCoverage: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  analysis: string;
}

/**
 * ATS Analyzer
 * Compares resumes against job descriptions and provides actionable insights
 */
export class ATSAnalyzer {
  /**
   * Analyzes ATS compatibility of original vs tailored resume against job description
   */
  async analyzeATS(
    originalResume: ResumeProfile,
    tailoredResume: ResumeProfile,
    jobDescription: string,
    options: ATSAnalysisOptions = {}
  ): Promise<ATSAnalysis> {
    const provider = await getEffectiveProvider(originalResume.id as string);
    
    const prompt = this.buildAnalysisPrompt(originalResume, tailoredResume, jobDescription, options);
    
    let analysis: any;
    
    switch (provider) {
      case "chatgpt":
        analysis = await this.analyzeWithChatGPT(originalResume.id as string, prompt);
        break;
      case "gemini":
        analysis = await this.analyzeWithGemini(originalResume.id as string, prompt);
        break;
      case "deepseek":
        analysis = await this.analyzeWithDeepSeek(originalResume.id as string, prompt);
        break;
      default:
        throw new Error(`Unsupported AI provider: ${provider}`);
    }
    
    return this.parseAnalysis(analysis);
  }
  
  /**
   * Builds the ATS analysis prompt
   */
  private buildAnalysisPrompt(
    originalResume: ResumeProfile,
    tailoredResume: ResumeProfile,
    jobDescription: string,
    options: ATSAnalysisOptions
  ): string {
    const originalText = JSON.stringify(originalResume, null, 2);
    const tailoredText = JSON.stringify(tailoredResume, null, 2);
    
    // Token management for large content
    const MAX_TOKENS = 1000000; // Gemini context limit
    const systemPrompt = "You are an expert ATS analyst. Provide detailed, actionable analysis.";
    const estimatedTokens = estimateTokenCount(systemPrompt + originalText + tailoredText + jobDescription);
    
    let finalJobDescription = jobDescription;
    if (estimatedTokens > MAX_TOKENS) {
      const availableTokens = MAX_TOKENS - estimateTokenCount(systemPrompt + originalText + tailoredText) - 1000;
      finalJobDescription = truncateText(jobDescription, availableTokens);
    }
    
    return `You are an expert ATS (Applicant Tracking System) analyst. Your task is to compare two resumes against a job description and provide actionable insights.

JOB DESCRIPTION:
${finalJobDescription}

ORIGINAL RESUME:
${originalText}

TAILORED RESUME:
${tailoredText}

ANALYSIS REQUIREMENTS:
1. Extract key keywords from the job description (skills, technologies, domain-specific terms)
2. Compare original resume against job description and calculate ATS score (0-100)
3. Compare tailored resume against job description and calculate ATS score (0-100)
4. Calculate keyword coverage percentage (how many job keywords are present in the resume)
5. List matched keywords (from job description found in tailored resume)
6. List missing keywords (from job description not found in tailored resume)
7. Identify strengths of the tailored resume (what improved)
8. Identify weaknesses (what still needs improvement)
9. Provide specific, actionable suggestions for further optimization
10. Explain WHY the scores exist and what improvements were made after tailoring

ANALYSIS RULES:
- Score based on keyword density, semantic similarity, and section completeness
- Keyword coverage = (matched keywords / total important keywords) * 100
- Do not simply output a percentage - explain the reasoning
- Be specific about what improved and why
- Focus on ATS optimization: keywords, formatting, section headers, content depth
- Provide at least 3 specific, actionable suggestions

Return the analysis as JSON with this structure:
{
  "originalScore": number,
  "tailoredScore": number,
  "keywordCoverage": number,
  "matchedKeywords": ["keyword1", "keyword2"],
  "missingKeywords": ["keyword1", "keyword2"],
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "suggestions": ["suggestion1", "suggestion2"],
  "analysis": "detailed explanation of scores and improvements"
}`;
  }
  
  /**
   * Analyzes using ChatGPT
   */
  private async analyzeWithChatGPT(uid: string, prompt: string): Promise<any> {
    const messages = [
      { role: "system", content: "You are an expert ATS analyst. Provide detailed, actionable analysis." },
      { role: "user", content: prompt }
    ];
    
    const response = await makeChatGPTRequest(uid, messages);
    return this.extractJSONFromResponse(response);
  }
  
  /**
   * Analyzes using Gemini
   */
  private async analyzeWithGemini(uid: string, prompt: string): Promise<any> {
    const response = await makeGeminiRequest(uid, prompt);
    return this.extractJSONFromResponse(response);
  }
  
  /**
   * Analyzes using DeepSeek
   */
  private async analyzeWithDeepSeek(uid: string, prompt: string): Promise<any> {
    const messages = [
      { role: "system", content: "You are an expert ATS analyst. Provide detailed, actionable analysis." },
      { role: "user", content: prompt }
    ];
    
    const response = await makeDeepSeekRequest(uid, messages);
    return this.extractJSONFromResponse(response);
  }
  
  /**
   * Extracts JSON from AI response
   */
  private extractJSONFromResponse(response: string): any {
    try {
      return JSON.parse(response);
    } catch {
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      
      const objectMatch = response.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        return JSON.parse(objectMatch[0]);
      }
      
      throw new Error("Could not extract JSON from AI response");
    }
  }
  
  /**
   * Parses and validates the analysis response
   */
  private parseAnalysis(analysis: any): ATSAnalysis {
    // Validate structure
    if (!analysis.originalScore || !analysis.tailoredScore || !analysis.keywordCoverage) {
      throw new Error("Invalid ATS analysis: missing required scores");
    }
    
    // Validate score ranges
    if (analysis.originalScore < 0 || analysis.originalScore > 100) {
      throw new Error("Invalid original score: must be 0-100");
    }
    
    if (analysis.tailoredScore < 0 || analysis.tailoredScore > 100) {
      throw new Error("Invalid tailored score: must be 0-100");
    }
    
    if (analysis.keywordCoverage < 0 || analysis.keywordCoverage > 100) {
      throw new Error("Invalid keyword coverage: must be 0-100");
    }
    
    // Validate arrays
    if (!Array.isArray(analysis.matchedKeywords) || !Array.isArray(analysis.missingKeywords)) {
      throw new Error("Invalid keyword arrays");
    }
    
    if (!Array.isArray(analysis.strengths) || !Array.isArray(analysis.weaknesses) || !Array.isArray(analysis.suggestions)) {
      throw new Error("Invalid analysis arrays");
    }
    
    return analysis as ATSAnalysis;
  }
}

/**
 * Factory function to create ATS analyzer
 */
export function createATSAnalyzer(): ATSAnalyzer {
  return new ATSAnalyzer();
}