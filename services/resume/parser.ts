import { parsePdf, extractStructuredText } from "@/lib/pdf-parse-wrapper";
import { createLLMResumeParser } from "@/services/resume/llm-parser";
import type { ResumeProfile } from "@/types/resume";

// This file should only be imported by server-side code (API routes, server actions, etc.)
// It uses Node-only libraries like pdf-parse

const PARSER_VERSION = "3.0.0";

export async function parseResume(file: File, uid?: string): Promise<ResumeProfile> {
  if (!uid) {
    throw new Error("User ID is required for resume parsing");
  }

  let extractedText = "";
  
  try {
    if (file.type === "application/pdf") {
      const rawText = await extractTextFromPdf(file);
      extractedText = extractStructuredText(rawText);
    } else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || 
               file.name.endsWith(".docx")) {
      extractedText = extractStructuredText(await extractTextFromDocx(file));
    } else {
      throw new Error(`Unsupported file type: ${file.type}. Only PDF and DOCX files are supported.`);
    }
  } catch (error) {
    console.error("Document extraction failed:", error);
    throw new Error(`Failed to extract text from document: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  if (!extractedText || extractedText.length < 50) {
    throw new Error("Extracted text is too short or empty. Please ensure the document contains readable text.");
  }

  // Only use LLM-based parsing - no regex fallback
  try {
    const llmParser = createLLMResumeParser(uid);
    const llmProfile = await llmParser.extractResumeProfile({ extractedText, uid });

    if (!llmProfile) {
      throw new Error("LLM parsing returned no data");
    }

    const validated = validateResumeProfile(llmProfile);
    return {
      ...validated,
      parserVersion: PARSER_VERSION,
      lastParsedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("LLM parsing failed:", error);
    throw new Error(`Resume parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validates and corrects common parsing failures
 */
function validateResumeProfile(profile: ResumeProfile): ResumeProfile {
  const validated = { ...profile };

  // Check if summary equals contact information
  if (isContactInfoText(validated.summary)) {
    validated.summary = "";
  }

  // Check if location contains email or phone
  if (validated.personal.location) {
    if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(validated.personal.location) ||
        /(\+?\d[\d\s().-]{8,}\d)/.test(validated.personal.location)) {
      validated.personal.location = "";
    }
  }

  // Fix project names like "Project 1", "Project 2" - only if purely numeric
  validated.projects = validated.projects.filter(project => {
    // Only filter if it's exactly "Project N" with no other text
    return !/^Project\s+\d+$/i.test(project.name.trim());
  });

  // Fix experience with placeholder names
  validated.experience = validated.experience.filter(exp => {
    return exp.company !== "Unknown Company" && 
           exp.title !== "Professional Experience" &&
           exp.company.trim().length > 0 &&
           exp.title.trim().length > 0;
  });

  // Ensure experience has bullet points
  validated.experience = validated.experience.map(exp => {
    if (!exp.highlights || exp.highlights.length === 0) {
      if (exp.bulletPoints && exp.bulletPoints.length > 0) {
        exp.highlights = exp.bulletPoints;
      }
    }
    return exp;
  });

  // Ensure projects have actual names
  validated.projects = validated.projects.filter(project => {
    return project.name && 
           project.name.trim().length > 0 &&
           !/^Project\s+\d+$/i.test(project.name);
  });

  // Filter out OCR artifacts and page numbers from skills
  validated.skills = validated.skills.filter(skill => {
    const trimmed = skill.trim();
    // Filter out page numbers, common OCR artifacts
    if (/^\d+$/.test(trimmed)) return false; // Pure numbers
    if (/^Page\s*\d+$/i.test(trimmed)) return false; // Page numbers
    if (/^-\s*\d+\/\d+$/.test(trimmed)) return false; // Page fragments
    if (/^MS$/.test(trimmed)) return false; // Common OCR artifact
    if (trimmed.length < 1) return false; // Too short (allow single chars like "R", "C")
    return true;
  });

  // Filter out invalid experience entries (locations containing email, etc.)
  validated.experience = validated.experience.filter(exp => {
    if (exp.location && isContactInfoText(exp.location)) {
      return false;
    }
    return true;
  });

  // Filter out certifications that are just fragments
  validated.certifications = validated.certifications.filter(cert => {
    const title = typeof cert === 'string' ? cert : cert.title;
    if (title.length < 3) return false;
    if (/^\d+$/.test(title)) return false;
    return true;
  });

  return validated;
}

function isContactInfoText(text: string): boolean {
  if (!text) return false;
  return /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text) ||
         /(\+?\d[\d\s().-]{8,}\d)/.test(text) ||
         /https?:\/\/(?:www\.)?(linkedin|github)\.com/i.test(text);
}

async function extractTextFromPdf(file: File) {
  const data = Buffer.from(await file.arrayBuffer());
  const result = await parsePdf(data);
  return result.text ?? "";
}

async function extractTextFromDocx(file: File) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const { default: mammoth } = await import("mammoth");
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value ?? "";
  } catch (error) {
    console.error("Error extracting text from DOCX:", error);
    throw new Error("Failed to extract text from DOCX file");
  }
}