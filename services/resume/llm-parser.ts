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
  linkedin: z.string().url().optional().or(z.literal("")),
  github: z.string().url().optional().or(z.literal("")),
  portfolio: z.string().url().optional().or(z.literal("")),
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
  link: z.string().url().optional().or(z.literal("")),
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
  summary: z.string(),
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
9. Links should be extracted as they appear in the resume
10. For education, extract CGPA, percentage, board, and school information when present

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
      
      // Temporary debug log before LLM request
      console.log({
        effectiveProvider: provider,
        hasGeminiKey: !!process.env.GEMINI_API_KEY,
      });
      
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

      // Convert to ResumeProfile format
      return {
        id: "primary",
        personal: {
          ...validatedData.personal,
          linkedin: validatedData.personal.linkedin || undefined,
          github: validatedData.personal.github || undefined,
          portfolio: validatedData.personal.portfolio || undefined,
        },
        summary: validatedData.summary,
        skills: validatedData.skills,
        experience: validatedData.experience.map(exp => ({
          ...exp,
          highlights: exp.bulletPoints,
          bulletPoints: exp.bulletPoints,
          technologies: exp.technologies.length > 0 ? exp.technologies : undefined,
        })),
        projects: validatedData.projects.map(proj => ({
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
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: USER_PROMPT(resumeText) },
    ];

    const response = await makeChatGPTRequest(uid, messages);
    return this.extractJSONFromResponse(response);
  }

  private async parseWithGemini(uid: string, resumeText: string): Promise<any> {
    const prompt = `${SYSTEM_PROMPT}\n\n${USER_PROMPT(resumeText)}`;
    const response = await makeGeminiRequest(uid, prompt);
    return this.extractJSONFromResponse(response);
  }

  private async parseWithDeepSeek(uid: string, resumeText: string): Promise<any> {
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