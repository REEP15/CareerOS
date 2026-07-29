import { getResumeExtractionProvider } from "@/lib/ai";
import { parsePdf } from "@/lib/pdf-parse-wrapper";
import type { Education, Experience, Project, ResumeProfile } from "@/types/resume";

// This file should only be imported by server-side code (API routes, server actions, etc.)
// It uses Node-only libraries like pdf-parse

const SECTION_MARKERS = ["experience", "projects", "education", "skills", "certifications"] as const;

type PdfParseResult = {
  text?: string;
};

const PARSER_VERSION = "1.0.0";

export async function parseResume(file: File): Promise<ResumeProfile> {
  let extractedText = "";
  
  if (file.type === "application/pdf") {
    extractedText = normalizeWhitespace(await extractTextFromPdf(file));
  } else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || 
             file.name.endsWith(".docx")) {
    extractedText = normalizeWhitespace(await extractTextFromDocx(file));
  } else {
    // Fallback: try to extract as text
    extractedText = normalizeWhitespace(await file.text());
  }

  const provider = getResumeExtractionProvider();

  if (provider) {
    const aiProfile = await provider.extractResumeProfile({ extractedText });

    if (aiProfile) {
      return {
        ...aiProfile,
        parserVersion: PARSER_VERSION,
        lastParsedAt: new Date().toISOString(),
      };
    }
  }

  return buildMockResumeProfile(extractedText, file.name);
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
    return "";
  }
}

function normalizeWhitespace(value: string) {
  return value.replace(/\r/g, "\n").replace(/\n{2,}/g, "\n").replace(/[ \t]+/g, " ").trim();
}

function buildMockResumeProfile(extractedText: string, fileName: string): ResumeProfile {
  const lines = extractedText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const name = inferName(lines, fileName);
  const email = matchPattern(extractedText, /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i) ?? "unknown@example.com";
  const phone = matchPattern(extractedText, /(\+?\d[\d\s().-]{8,}\d)/) ?? "Not provided";
  const linkedin = matchPattern(extractedText, /https?:\/\/(?:www\.)?linkedin\.com\/[^\s]+/i);
  const github = matchPattern(extractedText, /https?:\/\/(?:www\.)?github\.com\/[^\s]+/i);
  const portfolio = inferPortfolio(extractedText, linkedin, github);
  const location = inferLocation(lines);
  const summary = inferSummary(extractedText);
  const skills = inferSkills(extractedText);

  return {
    id: "primary",
    personal: {
      name,
      email,
      phone,
      location,
      linkedin: linkedin ?? undefined,
      github: github ?? undefined,
      portfolio: portfolio ?? undefined,
    },
    summary,
    skills,
    experience: inferExperience(extractedText),
    projects: inferProjects(extractedText),
    education: inferEducation(extractedText),
    certifications: inferCertifications(extractedText),
    preferredRoles: inferPreferredRoles(extractedText, summary),
    preferredLocations: location === "Remote / Flexible" ? [] : [location],
    updatedAt: new Date().toISOString(),
  };
}

function inferName(lines: string[], fileName: string) {
  const firstLine = lines.find((line) => /^[A-Za-z][A-Za-z\s.'-]{3,}$/.test(line));

  if (firstLine) {
    return titleCase(firstLine);
  }

  return titleCase(fileName.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "));
}

function inferLocation(lines: string[]) {
  const match = lines.find((line) =>
    /\b(remote|india|united states|usa|new york|san francisco|london|bangalore|bengaluru|mumbai|delhi)\b/i.test(
      line,
    ),
  );

  return match ?? "Remote / Flexible";
}

function inferSummary(extractedText: string) {
  const paragraphs = extractedText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 40 && !SECTION_MARKERS.some((marker) => line.toLowerCase() === marker));

  return paragraphs[0] ?? "Resume imported into CareerOS. Summary needs review.";
}

function inferSkills(extractedText: string) {
  const knownSkills = [
    "TypeScript",
    "JavaScript",
    "React",
    "Next.js",
    "Node.js",
    "Tailwind CSS",
    "Firebase",
    "Python",
    "SQL",
    "AWS",
    "Docker",
    "Git",
    "Machine Learning",
    "Prompt Engineering",
  ];

  const matches = knownSkills.filter((skill) => new RegExp(`\\b${escapeRegExp(skill)}\\b`, "i").test(extractedText));

  if (matches.length > 0) {
    return matches;
  }

  const skillsSection = pickSection(extractedText, "skills");
  const fallbackSkills = skillsSection
    .split(/[,|•]/)
    .map((value) => value.trim())
    .filter((value) => value.length > 1)
    .slice(0, 8);

  return fallbackSkills.length > 0 ? [...new Set(fallbackSkills)] : ["Communication", "Problem Solving"];
}

function inferExperience(extractedText: string): Experience[] {
  const section = pickSection(extractedText, "experience");

  if (!section) {
    return [];
  }

  return splitSectionEntries(section)
    .slice(0, 3)
    .map((entry) => ({
      company: entry.split("-")[0]?.trim() || "Unknown Company",
      title: entry.split("-")[1]?.trim() || "Professional Experience",
      highlights: [entry],
    }));
}

function inferProjects(extractedText: string): Project[] {
  const section = pickSection(extractedText, "projects");

  if (!section) {
    return [];
  }

  return splitSectionEntries(section)
    .slice(0, 3)
    .map((entry, index) => ({
      name: `Project ${index + 1}`,
      description: entry,
      technologies: inferSkills(entry).slice(0, 4),
    }));
}

function inferEducation(extractedText: string): Education[] {
  const section = pickSection(extractedText, "education");

  if (!section) {
    return [];
  }

  return splitSectionEntries(section)
    .slice(0, 2)
    .map((entry) => ({
      institution: entry.split(",")[0]?.trim() || entry,
      degree: entry,
    }));
}

function inferCertifications(extractedText: string) {
  const section = pickSection(extractedText, "certifications");

  if (!section) {
    return [];
  }

  return splitSectionEntries(section).slice(0, 5);
}

function inferPreferredRoles(extractedText: string, summary: string) {
  const roleKeywords = [
    "Software Engineer",
    "Frontend Engineer",
    "Full Stack Engineer",
    "Product Manager",
    "Data Analyst",
    "AI Engineer",
  ];

  const source = `${summary}\n${extractedText}`;
  const matches = roleKeywords.filter((role) => new RegExp(escapeRegExp(role), "i").test(source));
  return matches.length > 0 ? matches : ["Software Engineer"];
}

function inferPortfolio(extractedText: string, linkedin: string | null, github: string | null) {
  const urls = extractedText.match(/https?:\/\/[^\s]+/gi) ?? [];
  return urls.find((url) => url !== linkedin && url !== github) ?? null;
}

function pickSection(text: string, sectionName: (typeof SECTION_MARKERS)[number]) {
  const lowerText = text.toLowerCase();
  const startIndex = lowerText.indexOf(sectionName);

  if (startIndex === -1) {
    return "";
  }

  const nextIndexCandidates = SECTION_MARKERS
    .filter((marker) => marker !== sectionName)
    .map((marker) => lowerText.indexOf(marker, startIndex + sectionName.length))
    .filter((index) => index > startIndex);

  const endIndex = nextIndexCandidates.length > 0 ? Math.min(...nextIndexCandidates) : text.length;
  return text.slice(startIndex + sectionName.length, endIndex).trim();
}

function splitSectionEntries(section: string) {
  return section
    .split("\n")
    .flatMap((line) => line.split("•"))
    .map((entry) => entry.trim().replace(/^-+/, "").trim())
    .filter((entry) => entry.length > 10);
}

function matchPattern(value: string, expression: RegExp) {
  return value.match(expression)?.[0] ?? null;
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split(" ")
    .map((part) => (part ? `${part[0].toUpperCase()}${part.slice(1)}` : part))
    .join(" ");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
