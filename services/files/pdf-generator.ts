/**
 * PDF generation service for resumes and cover letters
 * Converts text content to downloadable PDF files for automation uploads
 */

import { existsSync, mkdirSync, createWriteStream, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import PDFDocument from "pdfkit";

export interface PDFGenerationOptions {
  title?: string;
  author?: string;
  creator?: string;
  fontSize?: number;
  margin?: number;
}

/**
 * Generate a PDF from text content
 * Returns the path to the generated PDF file
 */
export async function generatePDF(
  content: string,
  options: PDFGenerationOptions = {},
): Promise<string> {
  const {
    title = "Document",
    author = "CareerOS",
    creator = "CareerOS",
    fontSize = 12,
    margin = 72, // 1 inch in points
  } = options;

  // Create temp directory if it doesn't exist
  const tempDir = join(tmpdir(), "careeros-pdf");
  if (!existsSync(tempDir)) {
    mkdirSync(tempDir, { recursive: true });
  }

  // Generate unique filename
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`;
  const filePath = join(tempDir, filename);

  // Create PDF document
  const doc = new PDFDocument({
    margins: {
      top: margin,
      bottom: margin,
      left: margin,
      right: margin,
    },
    info: {
      Title: title,
      Author: author,
      Creator: creator,
    },
  });

  // Pipe to file
  const stream = createWriteStream(filePath);
  doc.pipe(stream);

  // Add content
  doc.fontSize(fontSize);
  doc.text(content, {
    align: "left",
    lineGap: fontSize * 0.5,
  });

  // Finalize PDF
  doc.end();

  // Wait for stream to finish
  return new Promise((resolve, reject) => {
    stream.on("finish", () => resolve(filePath));
    stream.on("error", reject);
  });
}

/**
 * Generate PDF from ResumeProfile
 */
export async function generateResumePDF(
  resume: any, // ResumeProfile type
  options: PDFGenerationOptions = {},
): Promise<string> {
  const tempDir = join(tmpdir(), "careeros-pdf");
  if (!existsSync(tempDir)) {
    mkdirSync(tempDir, { recursive: true });
  }

  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`;
  const filePath = join(tempDir, filename);

  const doc = new PDFDocument({
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    info: {
      Title: `${resume.personal.name} - Resume`,
      Author: resume.personal.name,
      Creator: "CareerOS",
    },
  });

  const stream = createWriteStream(filePath);
  doc.pipe(stream);

  // Header
  doc.fontSize(20).font("Helvetica-Bold").text(resume.personal.name, { align: "left" });
  doc.fontSize(11).font("Helvetica").text(resume.personal.email);
  doc.text(resume.personal.phone);
  if (resume.personal.linkedin) doc.text(resume.personal.linkedin);
  if (resume.personal.github) doc.text(resume.personal.github);
  if (resume.personal.portfolio) doc.text(resume.personal.portfolio);
  doc.moveDown();

  // Summary
  if (resume.summary) {
    doc.fontSize(14).font("Helvetica-Bold").text("SUMMARY");
    doc.fontSize(11).font("Helvetica").text(resume.summary);
    doc.moveDown();
  }

  // Experience
  if (resume.experience && resume.experience.length > 0) {
    doc.fontSize(14).font("Helvetica-Bold").text("EXPERIENCE");
    doc.moveDown(0.5);
    for (const exp of resume.experience) {
      doc.fontSize(12).font("Helvetica-Bold").text(`${exp.title} at ${exp.company}`);
      doc.fontSize(10).font("Helvetica").text(`${exp.startDate} - ${exp.endDate || "Present"}`);
      doc.fontSize(11).font("Helvetica").text(exp.description);
      doc.moveDown();
    }
  }

  // Education
  if (resume.education && resume.education.length > 0) {
    doc.fontSize(14).font("Helvetica-Bold").text("EDUCATION");
    doc.moveDown(0.5);
    for (const edu of resume.education) {
      doc.fontSize(12).font("Helvetica-Bold").text(`${edu.degree} in ${edu.field}`);
      doc.fontSize(10).font("Helvetica").text(`${edu.school}`);
      doc.fontSize(10).font("Helvetica").text(`${edu.graduationYear}`);
      doc.moveDown();
    }
  }

  // Skills
  if (resume.skills && resume.skills.length > 0) {
    doc.fontSize(14).font("Helvetica-Bold").text("SKILLS");
    doc.fontSize(11).font("Helvetica").text(resume.skills.join(", "));
  }

  doc.end();

  return new Promise((resolve, reject) => {
    stream.on("finish", () => resolve(filePath));
    stream.on("error", reject);
  });
}

/**
 * Generate PDF from cover letter text
 */
export async function generateCoverLetterPDF(
  coverLetter: string,
  options: PDFGenerationOptions = {},
): Promise<string> {
  const tempDir = join(tmpdir(), "careeros-pdf");
  if (!existsSync(tempDir)) {
    mkdirSync(tempDir, { recursive: true });
  }

  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`;
  const filePath = join(tempDir, filename);

  const doc = new PDFDocument({
    margins: { top: 72, bottom: 72, left: 72, right: 72 },
    info: {
      Title: "Cover Letter",
      Author: "CareerOS",
      Creator: "CareerOS",
    },
  });

  const stream = createWriteStream(filePath);
  doc.pipe(stream);

  doc.fontSize(12).font("Helvetica").text(coverLetter, {
    align: "left",
    lineGap: 14,
  });

  doc.end();

  return new Promise((resolve, reject) => {
    stream.on("finish", () => resolve(filePath));
    stream.on("error", reject);
  });
}

/**
 * Clean up temporary PDF file
 */
export function cleanupPDF(filePath: string): void {
  try {
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  } catch (error) {
    console.error("Failed to cleanup PDF file:", error);
  }
}
