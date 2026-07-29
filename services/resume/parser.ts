import { getResumeExtractionProvider } from "@/lib/ai";
import { parsePdf, extractStructuredText } from "@/lib/pdf-parse-wrapper";
import { escapeRegExp, createSkillPattern } from "@/lib/utils";
import type { Education, Experience, Project, ResumeProfile, Certification } from "@/types/resume";

// This file should only be imported by server-side code (API routes, server actions, etc.)
// It uses Node-only libraries like pdf-parse

const SECTION_MARKERS = ["experience", "projects", "education", "skills", "certifications", "summary"] as const;

type PdfParseResult = {
  text?: string;
};

const PARSER_VERSION = "2.0.0";

export async function parseResume(file: File): Promise<ResumeProfile> {
  let extractedText = "";
  
  if (file.type === "application/pdf") {
    const rawText = await extractTextFromPdf(file);
    extractedText = extractStructuredText(rawText);
  } else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || 
             file.name.endsWith(".docx")) {
    extractedText = extractStructuredText(await extractTextFromDocx(file));
  } else {
    // Fallback: try to extract as text
    extractedText = extractStructuredText(await file.text());
  }

  const provider = getResumeExtractionProvider();

  if (provider) {
    const aiProfile = await provider.extractResumeProfile({ extractedText });

    if (aiProfile) {
      const validated = validateResumeProfile(aiProfile);
      return {
        ...validated,
        parserVersion: PARSER_VERSION,
        lastParsedAt: new Date().toISOString(),
      };
    }
  }

  const profile = buildResumeProfile(extractedText, file.name);
  return validateResumeProfile(profile);
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

  // Fix project names like "Project 1", "Project 2"
  validated.projects = validated.projects.filter(project => {
    return !/^Project\s+\d+$/i.test(project.name);
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
    return "";
  }
}

function buildResumeProfile(extractedText: string, fileName: string): ResumeProfile {
  const lines = extractedText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const personal = extractPersonalInfo(lines, extractedText, fileName);
  const summary = extractSummary(lines, extractedText);
  const skills = extractSkills(extractedText);
  const experience = extractExperience(extractedText);
  const projects = extractProjects(extractedText);
  const education = extractEducation(extractedText);
  const certifications = extractCertifications(extractedText);

  return {
    id: "primary",
    personal,
    summary,
    skills,
    experience,
    projects,
    education,
    certifications,
    preferredRoles: extractPreferredRoles(extractedText, summary),
    preferredLocations: personal.location !== "Remote / Flexible" ? [personal.location] : [],
    updatedAt: new Date().toISOString(),
  };
}

function extractPersonalInfo(lines: string[], extractedText: string, fileName: string): ResumeProfile["personal"] {
  const name = extractName(lines, fileName);
  const email = matchPattern(extractedText, /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const phone = matchPattern(extractedText, /(\+?\d[\d\s().-]{8,}\d)/);
  const linkedin = matchPattern(extractedText, /https?:\/\/(?:www\.)?linkedin\.com\/[^\s]+/i);
  const github = matchPattern(extractedText, /https?:\/\/(?:www\.)?github\.com\/[^\s]+/i);
  const portfolio = extractPortfolio(extractedText, linkedin, github);
  const location = extractLocation(lines, email, phone);

  return {
    name: name || "Unknown",
    email: email || "",
    phone: phone || "",
    location: location || "",
    linkedin: linkedin || undefined,
    github: github || undefined,
    portfolio: portfolio || undefined,
  };
}

function extractName(lines: string[], fileName: string): string | null {
  // Look for a name pattern: first line that looks like a name (no special chars except spaces/hyphens/apostrophes)
  const namePattern = /^[A-Z][a-z]+(?:[-'\s][A-Z][a-z]+)*$/;
  const candidate = lines.find((line) => namePattern.test(line) && line.length > 2 && line.length < 50);
  
  if (candidate) {
    return candidate;
  }

  // Fallback to filename without extension
  return fileName.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
}

function extractLocation(lines: string[], email: string | null, phone: string | null): string | null {
  // Look for location patterns that are NOT email or phone
  const locationPatterns = [
    /\b(?:City|State|Country|Location|Address)[\s:]*([A-Za-z\s,]+)$/i,
    /\b([A-Za-z\s]+(?:,|\s)[A-Za-z\s]+)\s*(?:[0-9]{5})?$/, // City, State or City, Country
    /\b(Remote|Hybrid|On-site)\b/i,
  ];

  for (const line of lines) {
    // Skip if this line contains email or phone
    if (email && line.includes(email)) continue;
    if (phone && line.includes(phone)) continue;
    
    for (const pattern of locationPatterns) {
      const match = line.match(pattern);
      if (match) {
        return match[1]?.trim() || match[0]?.trim() || null;
      }
    }
  }

  return null;
}

function extractSummary(lines: string[], extractedText: string): string {
  // Look for a summary section that's NOT just contact info
  const summarySection = pickSection(extractedText, "summary");
  if (summarySection) {
    const summary = summarySection.split("\n")[0]?.trim();
    if (summary && summary.length > 20 && !isContactInfoText(summary)) {
      return summary;
    }
  }

  // Look for first paragraph that's long enough and not contact info
  for (const line of lines) {
    if (line.length > 40 && !isContactInfoText(line) && !isSectionHeader(line)) {
      return line;
    }
  }

  return "";
}

function isSectionHeader(line: string): boolean {
  const upperLine = line.toUpperCase();
  return SECTION_MARKERS.some(marker => upperLine.includes(marker.toUpperCase()));
}

function extractSkills(extractedText: string): string[] {
  const skillsSection = pickSection(extractedText, "skills");
  if (!skillsSection) return [];

  // Extract skills from various formats
  const skills: string[] = [];
  
  // Split by common delimiters
  const parts = skillsSection.split(/[,|•\n]/);
  
  for (const part of parts) {
    const skill = part.trim();
    if (skill.length > 1 && skill.length < 50 && !isSectionHeader(skill)) {
      skills.push(skill);
    }
  }

  return [...new Set(skills)];
}

function extractExperience(extractedText: string): Experience[] {
  const experienceSection = pickSection(extractedText, "experience");
  if (!experienceSection) return [];

  const experiences: Experience[] = [];
  const entries = splitExperienceEntries(experienceSection);

  for (const entry of entries) {
    const exp = parseExperienceEntry(entry);
    if (exp && exp.company && exp.title) {
      experiences.push(exp);
    }
  }

  return experiences;
}

function splitExperienceEntries(section: string): string[] {
  const entries: string[] = [];
  let currentEntry = "";
  const lines = section.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Check if this looks like a new job entry (has company/title pattern)
    if (isJobEntryStart(trimmed) && currentEntry) {
      entries.push(currentEntry);
      currentEntry = trimmed;
    } else {
      currentEntry += (currentEntry ? "\n" : "") + trimmed;
    }
  }

  if (currentEntry) {
    entries.push(currentEntry);
  }

  return entries;
}

function isJobEntryStart(line: string): boolean {
  // Look for patterns like "Company Name - Title" or "Title at Company"
  return /^(.+?)\s*(?:-|at|@)\s*(.+)/.test(line) ||
         /^[A-Z][A-Za-z\s&]+,\s*[A-Z][A-Za-z\s]+$/.test(line); // Company, Location
}

function parseExperienceEntry(entry: string): Experience | null {
  const lines = entry.split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  const firstLine = lines[0];
  
  // Try to extract company and title from first line
  let company = "";
  let title = "";
  let location = "";
  let startDate = "";
  let endDate = "";

  // Pattern: "Company - Title" or "Title at Company"
  const dashMatch = firstLine.match(/^(.+?)\s*-\s*(.+)$/);
  const atMatch = firstLine.match(/^(.+?)\s+(?:at|@)\s+(.+)$/);
  
  if (dashMatch) {
    company = dashMatch[1].trim();
    title = dashMatch[2].trim();
  } else if (atMatch) {
    title = atMatch[1].trim();
    company = atMatch[2].trim();
  } else {
    // Try other patterns
    const parts = firstLine.split(/[,\n]/);
    if (parts.length >= 2) {
      company = parts[0].trim();
      title = parts[1].trim();
    }
  }

  // Extract dates from second line if present
  if (lines.length > 1) {
    const dateMatch = lines[1].match(/(\d{1,2}\/\d{4}|[A-Za-z]+\s+\d{4}|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec).*?(?:-|to|–|—)\s*(\d{1,2}\/\d{4}|[A-Za-z]+\s+\d{4}|Present|Current)?/i);
    if (dateMatch) {
      startDate = dateMatch[1] || "";
      endDate = dateMatch[2] || "";
    }
    
    // Extract location from second line
    const locationMatch = lines[1].match(/([A-Za-z\s]+(?:,|\s)[A-Za-z\s]+)$/);
    if (locationMatch) {
      location = locationMatch[1].trim();
    }
  }

  // Extract bullet points
  const bulletPoints: string[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("•") || line.startsWith("-") || line.startsWith("*")) {
      bulletPoints.push(line.replace(/^[•\-\*]\s*/, "").trim());
    } else if (line.length > 20 && !isDateLine(line)) {
      bulletPoints.push(line);
    }
  }

  // Extract technologies from bullet points
  const technologies = extractTechnologies(bulletPoints);

  return {
    company,
    title,
    location: location || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    highlights: bulletPoints,
    bulletPoints: bulletPoints.length > 0 ? bulletPoints : undefined,
    technologies: technologies.length > 0 ? technologies : undefined,
  };
}

function isDateLine(line: string): boolean {
  return /\d{1,2}\/\d{4}|[A-Za-z]+\s+\d{4}|Present|Current/i.test(line);
}

function extractTechnologies(bulletPoints: string[]): string[] {
  const techKeywords = [
    "JavaScript", "TypeScript", "Python", "Java", "C++", "C#", "Go", "Rust",
    "React", "Vue", "Angular", "Node.js", "Express", "Django", "Flask", "Spring",
    "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Terraform",
    "PostgreSQL", "MongoDB", "MySQL", "Redis", "Elasticsearch",
    "Git", "CI/CD", "Jenkins", "GitHub Actions", "Linux", "Unix"
  ];

  const technologies: string[] = [];
  for (const point of bulletPoints) {
    for (const tech of techKeywords) {
      if (createSkillPattern(tech, "i").test(point)) {
        technologies.push(tech);
      }
    }
  }

  return [...new Set(technologies)];
}

function extractProjects(extractedText: string): Project[] {
  const projectsSection = pickSection(extractedText, "projects");
  if (!projectsSection) return [];

  const projects: Project[] = [];
  const entries = splitSectionEntries(projectsSection);

  for (const entry of entries) {
    const project = parseProjectEntry(entry);
    if (project && project.name && !project.name.startsWith("Project")) {
      projects.push(project);
    }
  }

  return projects;
}

function parseProjectEntry(entry: string): Project | null {
  const lines = entry.split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  const name = lines[0].replace(/^[•\-\*]\s*/, "").trim();
  const description = lines.slice(1).join(" ").trim();
  const technologies = extractTechnologies(lines);

  return {
    name,
    description: description || "",
    technologies,
    bulletPoints: lines.length > 1 ? lines.slice(1) : undefined,
  };
}

function extractEducation(extractedText: string): Education[] {
  const educationSection = pickSection(extractedText, "education");
  if (!educationSection) return [];

  const educations: Education[] = [];
  const entries = splitSectionEntries(educationSection);

  for (const entry of entries) {
    const edu = parseEducationEntry(entry);
    if (edu && edu.institution) {
      educations.push(edu);
    }
  }

  return educations;
}

function parseEducationEntry(entry: string): Education | null {
  const lines = entry.split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  const firstLine = lines[0];
  
  let institution = "";
  let degree = "";
  let location = "";
  let startYear = "";
  let endYear = "";
  let cgpa = "";
  let percentage = "";
  let board = "";
  let school = "";

  // Try to parse institution and degree
  const parts = firstLine.split(/[,\n]/);
  if (parts.length >= 1) {
    institution = parts[0].trim();
  }
  if (parts.length >= 2) {
    degree = parts.slice(1).join(",").trim();
  }

  // Extract additional info from subsequent lines
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    
    // CGPA
    const cgpaMatch = line.match(/CGPA[:\s]*([0-9.]+)|([0-9.]+)\s*CGPA/i);
    if (cgpaMatch) {
      cgpa = cgpaMatch[1] || cgpaMatch[2];
    }

    // Percentage
    const percentMatch = line.match(/(\d+\.?\d*)\s*%/);
    if (percentMatch) {
      percentage = percentMatch[1];
    }

    // Board
    const boardMatch = line.match(/Board[:\s]*([A-Za-z\s]+)/i);
    if (boardMatch) {
      board = boardMatch[1].trim();
    }

    // School
    const schoolMatch = line.match(/School[:\s]*([A-Za-z\s]+)/i);
    if (schoolMatch) {
      school = schoolMatch[1].trim();
    }

    // Years
    const yearMatch = line.match(/(\d{4})\s*(?:-|to|–|—)\s*(\d{4}|Present)?/i);
    if (yearMatch) {
      startYear = yearMatch[1];
      endYear = yearMatch[2] || "";
    }

    // Location
    const locationMatch = line.match(/([A-Za-z\s]+(?:,|\s)[A-Za-z\s]+)$/);
    if (locationMatch && !isDateLine(line)) {
      location = locationMatch[1].trim();
    }
  }

  return {
    institution,
    degree,
    location: location || undefined,
    startYear: startYear || undefined,
    endYear: endYear || undefined,
    cgpa: cgpa || undefined,
    percentage: percentage || undefined,
    board: board || undefined,
    school: school || undefined,
  };
}

function extractCertifications(extractedText: string): Certification[] {
  const certificationsSection = pickSection(extractedText, "certifications");
  if (!certificationsSection) return [];

  const certifications: Certification[] = [];
  const entries = splitSectionEntries(certificationsSection);

  for (const entry of entries) {
    const cert = parseCertificationEntry(entry);
    if (cert && cert.title) {
      certifications.push(cert);
    }
  }

  return certifications;
}

function parseCertificationEntry(entry: string): Certification | null {
  const lines = entry.split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  const title = lines[0].replace(/^[•\-\*]\s*/, "").trim();
  let organization = "";
  let dates = "";
  const bulletPoints: string[] = [];

  // Extract organization and dates from subsequent lines
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    
    // Try to extract organization
    if (!organization && line.length < 100 && !isDateLine(line)) {
      organization = line;
    }

    // Try to extract dates
    const dateMatch = line.match(/(\d{1,2}\/\d{4}|[A-Za-z]+\s+\d{4}|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec).*?(?:-|to|–|—)\s*(\d{1,2}\/\d{4}|[A-Za-z]+\s+\d{4}|Present)?/i);
    if (dateMatch) {
      dates = line.trim();
    }

    // Collect bullet points
    if (line.startsWith("•") || line.startsWith("-") || line.startsWith("*")) {
      bulletPoints.push(line.replace(/^[•\-\*]\s*/, "").trim());
    }
  }

  return {
    title,
    organization: organization || undefined,
    dates: dates || undefined,
    bulletPoints: bulletPoints.length > 0 ? bulletPoints : undefined,
  };
}

function extractPreferredRoles(extractedText: string, summary: string): string[] {
  const roleKeywords = [
    "Software Engineer", "Frontend Engineer", "Backend Engineer", "Full Stack Engineer",
    "Product Manager", "Data Analyst", "AI Engineer", "Machine Learning Engineer",
    "DevOps Engineer", "Site Reliability Engineer", "Mobile Developer",
    "Web Developer", "Application Developer", "Systems Engineer"
  ];

  const source = `${summary}\n${extractedText}`;
  const matches: string[] = [];

  for (const role of roleKeywords) {
    if (createSkillPattern(role, "i").test(source)) {
      matches.push(role);
    }
  }

  return matches.length > 0 ? matches : [];
}

function extractPortfolio(extractedText: string, linkedin: string | null, github: string | null): string | null {
  const urls = extractedText.match(/https?:\/\/[^\s]+/gi) ?? [];
  return urls.find((url) => 
    url !== linkedin && 
    url !== github && 
    !url.includes("linkedin") && 
    !url.includes("github")
  ) ?? null;
}

function pickSection(text: string, sectionName: (typeof SECTION_MARKERS)[number]): string {
  const lowerText = text.toLowerCase();
  
  // Find the section header (case-insensitive)
  const sectionPattern = new RegExp(`^${sectionName}\\s*[:\\-]?\\s*`, "im");
  const match = text.match(sectionPattern);
  
  if (!match) {
    // Try to find any line containing the section name
    const index = lowerText.indexOf(sectionName);
    if (index === -1) return "";
    
    const startIndex = text.lastIndexOf("\n", index) + 1;
    const endIndex = findSectionEnd(text, startIndex + sectionName.length);
    return text.slice(startIndex, endIndex).trim();
  }

  const startIndex = match.index! + match[0].length;
  const endIndex = findSectionEnd(text, startIndex);
  return text.slice(startIndex, endIndex).trim();
}

function findSectionEnd(text: string, startIndex: number): number {
  const lines = text.slice(startIndex).split("\n");
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (isSectionHeader(line) && i > 0) {
      return startIndex + lines.slice(0, i).join("\n").length;
    }
  }

  return text.length;
}

function splitSectionEntries(section: string): string[] {
  const entries: string[] = [];
  let currentEntry = "";
  const lines = section.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Check if this looks like a new entry (starts with bullet or is a header-like line)
    if ((trimmed.startsWith("•") || trimmed.startsWith("-") || trimmed.startsWith("*")) && currentEntry) {
      entries.push(currentEntry);
      currentEntry = trimmed;
    } else {
      currentEntry += (currentEntry ? "\n" : "") + trimmed;
    }
  }

  if (currentEntry) {
    entries.push(currentEntry);
  }

  return entries.filter(e => e.length > 5);
}

function matchPattern(value: string, expression: RegExp): string | null {
  return value.match(expression)?.[0] ?? null;
}
