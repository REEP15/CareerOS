import { z } from "zod";
import { getEffectiveProvider, makeChatGPTRequest, makeGeminiRequest, makeDeepSeekRequest } from "@/services/ai/providers";
import { getSettings } from "@/services/settings/settings";
import type { ResumeProfile } from "@/types/resume";
import type { ResumeExtractionProvider, ResumeExtractionContext } from "@/lib/ai";

// Zod schema for structured resume extraction
const personalInfoSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  location: z.string().min(1),
  linkedin: z.string().url().nullable().optional().or(z.literal("")),
  github: z.string().url().nullable().optional().or(z.literal("")),
  portfolio: z.string().url().nullable().optional().or(z.literal("")),
});

const experienceSchema = z.object({
  company: z.string().min(1),
  title: z.string().min(1),
  location: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  bulletPoints: z.array(z.string()).default([]),
  technologies: z.array(z.string()).default([]),
});

const projectSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  technologies: z.array(z.string()).default([]),
  link: z.string().url().nullable().optional().or(z.literal("")),
  links: z.array(z.string().url()).default([]),
  bulletPoints: z.array(z.string()).default([]),
});

const educationSchema = z.object({
  institution: z.string().min(1),
  degree: z.string().min(1),
  fieldOfStudy: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  startYear: z.string().nullable().optional(),
  endYear: z.string().nullable().optional(),
  cgpa: z.string().nullable().optional(),
  percentage: z.string().nullable().optional(),
  board: z.string().nullable().optional(),
  school: z.string().nullable().optional(),
});

const certificationSchema = z.object({
  title: z.string().min(1),
  organization: z.string().nullable().optional(),
  dates: z.string().nullable().optional(),
  bulletPoints: z.array(z.string()).default([]),
});

const resumeProfileSchema = z.object({
  personal: personalInfoSchema,
  summary: z.string().nullable(),
  skills: z.array(z.string()).default([]),
  experience: z.array(experienceSchema).default([]),
  projects: z.array(projectSchema).default([]),
  education: z.array(educationSchema).default([]),
  certifications: z.array(certificationSchema).default([]),
  preferredRoles: z.array(z.string()).default([]),
  preferredLocations: z.array(z.string()).default([]),
});

const SYSTEM_PROMPT = `You are an expert resume parser. Your task is to extract structured information from resume text accurately and completely.

IMPORTANT RULES:
1. Extract ONLY information that is explicitly present in the resume text
2. NEVER invent, hallucinate, or make up information
3. If information is not found, return null or empty array - NEVER use placeholders like "Unknown Company", "Project 1", "Professional Experience"
4. Ignore page numbers, headers, footers, and OCR artifacts
5. Preserve all skills exactly as written in the resume
6. Extract complete bullet points for experience, projects, and certifications
7. Extract all dates and location information accurately
8. Handle special characters in skills/technologies correctly (e.g., C++, C#, Node.js, .NET)
9. Links should be extracted as they appear in the resume - only populate URL fields when actual URLs are available
10. For education, extract CGPA, percentage, board, and school information when present
11. Return null for optional fields when not present (linkedin, github, portfolio, summary, etc.)
12. Never fabricate or infer URLs from contact information or company names

Return a valid JSON object matching the schema.`;

const USER_PROMPT = (resumeText: string) => `Parse the following resume text and extract structured information:

${resumeText}

Return the result as a JSON object with this structure:
{
  "personal": {
    "name": "string",
    "email": "string", 
    "phone": "string",
    "location": "string",
    "linkedin": "string (optional)",
    "github": "string (optional)",
    "portfolio": "string (optional)"
  },
  "summary": "string",
  "skills": ["string"],
  "experience": [
    {
      "company": "string",
      "title": "string",
      "location": "string (optional)",
      "startDate": "string (optional)",
      "endDate": "string (optional)",
      "bulletPoints": ["string"],
      "technologies": ["string"]
    }
  ],
  "projects": [
    {
      "name": "string",
      "description": "string",
      "technologies": ["string"],
      "link": "string (optional)",
      "links": ["string"],
      "bulletPoints": ["string"]
    }
  ],
  "education": [
    {
      "institution": "string",
      "degree": "string",
      "fieldOfStudy": "string (optional)",
      "location": "string (optional)",
      "startDate": "string (optional)",
      "endDate": "string (optional)",
      "startYear": "string (optional)",
      "endYear": "string (optional)",
      "cgpa": "string (optional)",
      "percentage": "string (optional)",
      "board": "string (optional)",
      "school": "string (optional)"
    }
  ],
  "certifications": [
    {
      "title": "string",
      "organization": "string (optional)",
      "dates": "string (optional)",
      "bulletPoints": ["string"]
    }
  ],
  "preferredRoles": ["string"],
  "preferredLocations": ["string"]
}`;

/**
 * Estimates token count for text (rough approximation: ~4 chars per token)
 */
function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Truncates text to fit within token limit while preserving structure
 */
function truncateText(text: string, maxTokens: number): string {
  const estimatedTokens = estimateTokenCount(text);
  if (estimatedTokens <= maxTokens) {
    return text;
  }
  
  // Truncate proportionally
  const ratio = maxTokens / estimatedTokens;
  const maxLength = Math.floor(text.length * ratio);
  return text.slice(0, maxLength) + "\n\n[Content truncated due to length]";
}

/**
 * Normalizes profile data to handle null values consistently
 * Converts null values to undefined and ensures proper defaults
 */
function normalizeProfileData(data: any): any {
  const normalized = { ...data };
  
  // Normalize personal info - strict URL handling
  if (normalized.personal) {
    normalized.personal = {
      ...normalized.personal,
      linkedin: normalizeUrl(normalized.personal.linkedin),
      github: normalizeUrl(normalized.personal.github),
      portfolio: normalizeUrl(normalized.personal.portfolio),
    };
  }
  
  // Normalize summary
  normalized.summary = normalized.summary === null ? "" : normalized.summary;
  
  // Normalize arrays
  normalized.skills = normalized.skills || [];
  normalized.experience = normalized.experience || [];
  normalized.projects = normalized.projects || [];
  normalized.education = normalized.education || [];
  normalized.certifications = normalized.certifications || [];
  normalized.preferredRoles = normalized.preferredRoles || [];
  normalized.preferredLocations = normalized.preferredLocations || [];
  
  // Normalize nested objects
  normalized.experience = normalized.experience.map((exp: any) => ({
    ...exp,
    location: exp.location === null ? undefined : exp.location,
    startDate: exp.startDate === null ? undefined : exp.startDate,
    endDate: exp.endDate === null ? undefined : exp.endDate,
  }));
  
  normalized.projects = normalized.projects.map((proj: any) => ({
    ...proj,
    link: normalizeUrl(proj.link),
  }));
  
  normalized.education = normalized.education.map((edu: any) => ({
    ...edu,
    fieldOfStudy: edu.fieldOfStudy === null ? undefined : edu.fieldOfStudy,
    location: edu.location === null ? undefined : edu.location,
    startDate: edu.startDate === null ? undefined : edu.startDate,
    endDate: edu.endDate === null ? undefined : edu.endDate,
    startYear: edu.startYear === null ? undefined : edu.startYear,
    endYear: edu.endYear === null ? undefined : edu.endYear,
    cgpa: edu.cgpa === null ? undefined : edu.cgpa,
    percentage: edu.percentage === null ? undefined : edu.percentage,
    board: edu.board === null ? undefined : edu.board,
    school: edu.school === null ? undefined : edu.school,
  }));
  
  normalized.certifications = normalized.certifications.map((cert: any) => ({
    ...cert,
    organization: cert.organization === null ? undefined : cert.organization,
    dates: cert.dates === null ? undefined : cert.dates,
  }));
  
  return normalized;
}

/**
 * Normalizes URL values - only accepts valid URLs, converts everything else to undefined
 */
function normalizeUrl(url: any): string | undefined {
  if (!url || url === null || url === "") {
    return undefined;
  }
  
  try {
    // Validate URL format
    new URL(url);
    return url;
  } catch {
    // Invalid URL - don't fabricate or infer
    return undefined;
  }
}

export class LLMResumeParser implements ResumeExtractionProvider {
  async extractResumeProfile(context: ResumeExtractionContext): Promise<ResumeProfile | null> {
    const { extractedText } = context;
    
    if (!extractedText || extractedText.length < 50) {
      console.error("Resume text too short for LLM parsing");
      return null;
    }

    try {
      // This will need a user ID to get their API key preference
      // For now, we'll use a default approach or require it to be passed in context
      const uid = (context as any).uid;
      if (!uid) {
        console.error("User ID required for LLM parsing");
        return null;
      }

      const provider = await getEffectiveProvider(uid);
      let parsedJSON: any;

      switch (provider) {
        case "chatgpt":
          parsedJSON = await this.parseWithChatGPT(uid, extractedText);
          break;
        case "gemini":
          parsedJSON = await this.parseWithGemini(uid, extractedText);
          break;
        case "deepseek":
          parsedJSON = await this.parseWithDeepSeek(uid, extractedText);
          break;
        default:
          console.error(`Unsupported AI provider: ${provider}`);
          return null;
      }

      if (!parsedJSON) {
        return null;
      }

      // Validate and parse the response
      const validatedData = resumeProfileSchema.parse(parsedJSON);

      // Normalize null values to undefined for consistency
      const normalizedData = normalizeProfileData(validatedData);

      // Convert to ResumeProfile format
      return {
        id: "primary",
        personal: {
          ...normalizedData.personal,
          linkedin: normalizedData.personal.linkedin || undefined,
          github: normalizedData.personal.github || undefined,
          portfolio: normalizedData.personal.portfolio || undefined,
        },
        summary: normalizedData.summary || "",
        skills: normalizedData.skills,
        experience: normalizedData.experience.map((exp: any) => ({
          ...exp,
          highlights: exp.bulletPoints,
          bulletPoints: exp.bulletPoints,
          technologies: exp.technologies.length > 0 ? exp.technologies : undefined,
        })),
        projects: normalizedData.projects.map((proj: any) => ({
          ...proj,
          link: proj.link || undefined,
          links: proj.links.length > 0 ? proj.links : undefined,
          bulletPoints: proj.bulletPoints.length > 0 ? proj.bulletPoints : undefined,
        })),
        education: normalizedData.education,
        certifications: normalizedData.certifications,
        preferredRoles: normalizedData.preferredRoles,
        preferredLocations: normalizedData.preferredLocations,
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error("LLM resume parsing error:", error);
      return null;
    }
  }

  private async parseWithChatGPT(uid: string, resumeText: string): Promise<any> {
    const MAX_TOKENS = 128000; // ChatGPT context limit
    const systemPromptTokens = estimateTokenCount(SYSTEM_PROMPT);
    const userPromptTokens = estimateTokenCount(USER_PROMPT(resumeText));
    const totalTokens = systemPromptTokens + userPromptTokens;
    
    if (totalTokens > MAX_TOKENS) {
      const availableTokens = MAX_TOKENS - systemPromptTokens - 1000; // Buffer
      resumeText = truncateText(resumeText, availableTokens);
    }
    
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: USER_PROMPT(resumeText) },
    ];

    const response = await makeChatGPTRequest(uid, messages);
    return this.extractJSONFromResponse(response);
  }

  private async parseWithGemini(uid: string, resumeText: string): Promise<any> {
    const MAX_TOKENS = 1000000; // Gemini context limit
    const prompt = `${SYSTEM_PROMPT}\n\n${USER_PROMPT(resumeText)}`;
    const estimatedTokens = estimateTokenCount(prompt);
    
    if (estimatedTokens > MAX_TOKENS) {
      const availableTokens = MAX_TOKENS - estimateTokenCount(SYSTEM_PROMPT) - 1000; // Buffer
      resumeText = truncateText(resumeText, availableTokens);
    }
    
    const response = await makeGeminiRequest(uid, `${SYSTEM_PROMPT}\n\n${USER_PROMPT(resumeText)}`);
    return this.extractJSONFromResponse(response);
  }

  private async parseWithDeepSeek(uid: string, resumeText: string): Promise<any> {
    const MAX_TOKENS = 128000; // DeepSeek context limit
    const systemPromptTokens = estimateTokenCount(SYSTEM_PROMPT);
    const userPromptTokens = estimateTokenCount(USER_PROMPT(resumeText));
    const totalTokens = systemPromptTokens + userPromptTokens;
    
    if (totalTokens > MAX_TOKENS) {
      const availableTokens = MAX_TOKENS - systemPromptTokens - 1000; // Buffer
      resumeText = truncateText(resumeText, availableTokens);
    }
    
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: USER_PROMPT(resumeText) },
    ];

    const response = await makeDeepSeekRequest(uid, messages);
    return this.extractJSONFromResponse(response);
  }

  private extractJSONFromResponse(response: string): any {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in LLM response");
    }

    try {
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      throw new Error("Failed to parse JSON from LLM response");
    }
  }
}

// Factory function to create the parser with user context
export function createLLMResumeParser(uid: string): ResumeExtractionProvider {
  return {
    async extractResumeProfile(context: ResumeExtractionContext): Promise<ResumeProfile | null> {
      const parser = new LLMResumeParser();
      return parser.extractResumeProfile({ ...context, uid });
    }
  };
}