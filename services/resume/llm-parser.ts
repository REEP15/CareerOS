import { z } from "zod";
import { getEffectiveProvider, makeChatGPTRequest, makeGeminiRequest, makeDeepSeekRequest } from "@/services/ai/providers";
import { getSettings } from "@/services/settings/settings";
import type { ResumeProfile } from "@/shared/types/resume";
import type { ResumeExtractionProvider, ResumeExtractionContext } from "@/shared/lib/ai";

// Zod schema for structured resume extraction
const personalInfoSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  location: z.string().min(1),
  linkedin: z.string().url().nullable().optional(),
  github: z.string().url().nullable().optional(),
  portfolio: z.string().url().nullable().optional(),
});

const experienceSchema = z.object({
  company: z.string().min(1),
  title: z.string().min(1),
  location: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  bulletPoints: z.array(z.string()).default([]),
  technologies: z.array(z.string()).default([]),
});

const projectSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  technologies: z.array(z.string()).default([]),
  link: z.string().url().nullable().optional(),
  links: z.array(z.string().url()).default([]),
  bulletPoints: z.array(z.string()).default([]),
});

const educationSchema = z.object({
  institution: z.string().min(1),
  degree: z.string().min(1),
  fieldOfStudy: z.string().optional(),
  location: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  startYear: z.string().optional(),
  endYear: z.string().optional(),
  cgpa: z.string().optional(),
  percentage: z.string().optional(),
  board: z.string().optional(),
  school: z.string().optional(),
});

const certificationSchema = z.object({
  title: z.string().min(1),
  organization: z.string().optional(),
  dates: z.string().optional(),
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
9. URL EXTRACTION RULES:
   - Only populate URL fields (linkedin, github, portfolio, project links) when you find ACTUAL URLs in the text
   - URLs must start with http://, https://, or be domain names (e.g., github.com/username)
   - DO NOT populate URL fields with labels like "GitHub", "LinkedIn", "Live Demo", "GitHub/REEP15"
   - DO NOT infer or fabricate URLs from usernames, company names, or contact information
   - If you see "GitHub/REEP15" as a label, do NOT put it in the github URL field
   - If you see "Live Demo" as a label, do NOT put it in the portfolio URL field
   - Return null for URL fields when no actual URL is found
10. For education, extract CGPA, percentage, board, and school information when present
11. Return null for optional fields when not present (linkedin, github, portfolio, summary, etc.)

Return a valid JSON object matching the schema. All URL fields must contain valid URLs or null - do not use labels like "GitHub" or "LinkedIn".`;

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
 * Classifies a value as URL or label
 * Returns normalized URL or undefined for labels
 */
function classifyAndNormalizeUrl(value: any): string | undefined {
  if (!value || value === null || value === "") {
    return undefined;
  }
  
  const stringValue = String(value).trim();
  
  // Check if it's already a valid URL
  try {
    new URL(stringValue);
    return stringValue;
  } catch {
    // Not a valid URL, continue with classification
  }
  
  // Check if it's a domain name without protocol
  if (/^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}/.test(stringValue)) {
    // Domain without protocol - add https://
    const normalizedUrl = `https://${stringValue}`;
    try {
      new URL(normalizedUrl);
      return normalizedUrl;
    } catch {
      return undefined;
    }
  }
  
  // Check if it starts with www. without protocol
  if (stringValue.startsWith("www.")) {
    const normalizedUrl = `https://${stringValue}`;
    try {
      new URL(normalizedUrl);
      return normalizedUrl;
    } catch {
      return undefined;
    }
  }
  
  // If we get here, it's likely a label or invalid
  return undefined;
}

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
 * Single canonical normalization stage
 * Transforms data into canonical form before validation
 */
function normalizeProfileData(data: any): any {
  const normalized = { ...data };
  
  // Normalize personal info
  if (normalized.personal) {
    normalized.personal = {
      name: trimAndFilter(normalized.personal.name),
      email: trimAndFilter(normalized.personal.email),
      phone: trimAndFilter(normalized.personal.phone),
      location: trimAndFilter(normalized.personal.location),
      linkedin: classifyAndNormalizeUrl(normalized.personal.linkedin),
      github: classifyAndNormalizeUrl(normalized.personal.github),
      portfolio: classifyAndNormalizeUrl(normalized.personal.portfolio),
    };
  }
  
  // Normalize summary
  normalized.summary = trimAndFilter(normalized.summary) || "";
  
  // Normalize and deduplicate arrays
  normalized.skills = deduplicateArray(normalized.skills || []).map(trimAndFilter).filter(Boolean);
  normalized.experience = normalized.experience || [];
  normalized.projects = normalized.projects || [];
  normalized.education = normalized.education || [];
  normalized.certifications = normalized.certifications || [];
  normalized.preferredRoles = deduplicateArray(normalized.preferredRoles || []).map(trimAndFilter).filter(Boolean);
  normalized.preferredLocations = deduplicateArray(normalized.preferredLocations || []).map(trimAndFilter).filter(Boolean);
  
  // Normalize nested objects
  normalized.experience = normalized.experience.map((exp: any) => ({
    company: trimAndFilter(exp.company),
    title: trimAndFilter(exp.title),
    location: trimOptional(exp.location),
    startDate: trimOptional(exp.startDate),
    endDate: trimOptional(exp.endDate),
    bulletPoints: (exp.bulletPoints || []).map(trimAndFilter).filter(Boolean),
    technologies: deduplicateArray(exp.technologies || []).map(trimAndFilter).filter(Boolean),
  }));
  
  normalized.projects = normalized.projects.map((proj: any) => ({
    name: trimAndFilter(proj.name),
    description: trimAndFilter(proj.description),
    link: classifyAndNormalizeUrl(proj.link),
    links: (proj.links || []).map(classifyAndNormalizeUrl).filter(Boolean),
    bulletPoints: (proj.bulletPoints || []).map(trimAndFilter).filter(Boolean),
    technologies: deduplicateArray(proj.technologies || []).map(trimAndFilter).filter(Boolean),
  }));
  
  normalized.education = normalized.education.map((edu: any) => ({
    institution: trimAndFilter(edu.institution),
    degree: trimAndFilter(edu.degree),
    fieldOfStudy: trimOptional(edu.fieldOfStudy),
    location: trimOptional(edu.location),
    startDate: trimOptional(edu.startDate),
    endDate: trimOptional(edu.endDate),
    startYear: trimOptional(edu.startYear),
    endYear: trimOptional(edu.endYear),
    cgpa: trimOptional(edu.cgpa),
    percentage: trimOptional(edu.percentage),
    board: trimOptional(edu.board),
    school: trimOptional(edu.school),
  }));
  
  normalized.certifications = normalized.certifications.map((cert: any) => ({
    title: trimAndFilter(cert.title),
    organization: trimOptional(cert.organization),
    dates: trimOptional(cert.dates),
    bulletPoints: (cert.bulletPoints || []).map(trimAndFilter).filter(Boolean),
  }));
  
  return normalized;
}

/**
 * Trims whitespace and converts empty strings or null to undefined
 */
function trimAndFilter(value: any): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  const trimmed = String(value).trim();
  return trimmed === "" ? undefined : trimmed;
}

/**
 * Trims whitespace but allows empty strings (for optional string fields)
 */
function trimOptional(value: any): string {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).trim();
}

/**
 * Trims whitespace but keeps empty strings for fields that can be empty
 */
function trimKeepEmpty(value: any): string {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).trim();
}

/**
 * Deduplicates an array while preserving order
 */
function deduplicateArray<T>(array: T[]): T[] {
  return Array.from(new Set(array));
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

      // Normalize data first (canonical transformation before validation)
      const normalizedData = normalizeProfileData(parsedJSON);

      // Validate and parse the response (Zod is the single validation authority)
      const validatedData = resumeProfileSchema.parse(normalizedData);

      // Convert to ResumeProfile format
      return {
        id: "primary",
        personal: {
          ...validatedData.personal,
          linkedin: validatedData.personal.linkedin || undefined,
          github: validatedData.personal.github || undefined,
          portfolio: validatedData.personal.portfolio || undefined,
        },
        summary: validatedData.summary || "",
        skills: validatedData.skills,
        experience: validatedData.experience.map((exp: any) => ({
          ...exp,
          highlights: exp.bulletPoints,
          bulletPoints: exp.bulletPoints,
          technologies: exp.technologies.length > 0 ? exp.technologies : undefined,
        })),
        projects: validatedData.projects.map((proj: any) => ({
          ...proj,
          link: proj.link || undefined,
          links: proj.links.length > 0 ? proj.links : undefined,
          bulletPoints: proj.bulletPoints.length > 0 ? proj.bulletPoints : undefined,
        })),
        education: validatedData.education,
        certifications: validatedData.certifications,
        preferredRoles: validatedData.preferredRoles,
        preferredLocations: validatedData.preferredLocations,
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