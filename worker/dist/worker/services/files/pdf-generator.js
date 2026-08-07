"use strict";
/**
 * PDF generation service for resumes and cover letters
 * Converts text content to downloadable PDF files for automation uploads
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePDF = generatePDF;
exports.generateResumePDF = generateResumePDF;
exports.generateCoverLetterPDF = generateCoverLetterPDF;
exports.cleanupPDF = cleanupPDF;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const node_os_1 = require("node:os");
const pdfkit_1 = __importDefault(require("pdfkit"));
/**
 * Generate a PDF from text content
 * Returns the path to the generated PDF file
 */
async function generatePDF(content, options = {}) {
    const { title = "Document", author = "CareerOS", creator = "CareerOS", fontSize = 12, margin = 72, // 1 inch in points
     } = options;
    // Create temp directory if it doesn't exist
    const tempDir = (0, node_path_1.join)((0, node_os_1.tmpdir)(), "careeros-pdf");
    if (!(0, node_fs_1.existsSync)(tempDir)) {
        (0, node_fs_1.mkdirSync)(tempDir, { recursive: true });
    }
    // Generate unique filename
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`;
    const filePath = (0, node_path_1.join)(tempDir, filename);
    // Create PDF document
    const doc = new pdfkit_1.default({
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
    const stream = (0, node_fs_1.createWriteStream)(filePath);
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
async function generateResumePDF(resume, // ResumeProfile type
options = {}) {
    const tempDir = (0, node_path_1.join)((0, node_os_1.tmpdir)(), "careeros-pdf");
    if (!(0, node_fs_1.existsSync)(tempDir)) {
        (0, node_fs_1.mkdirSync)(tempDir, { recursive: true });
    }
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`;
    const filePath = (0, node_path_1.join)(tempDir, filename);
    const doc = new pdfkit_1.default({
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        info: {
            Title: `${resume.personal.name} - Resume`,
            Author: resume.personal.name,
            Creator: "CareerOS",
        },
    });
    const stream = (0, node_fs_1.createWriteStream)(filePath);
    doc.pipe(stream);
    // Header
    doc.fontSize(20).font("Helvetica-Bold").text(resume.personal.name, { align: "left" });
    doc.fontSize(11).font("Helvetica").text(resume.personal.email);
    doc.text(resume.personal.phone);
    if (resume.personal.linkedin)
        doc.text(resume.personal.linkedin);
    if (resume.personal.github)
        doc.text(resume.personal.github);
    if (resume.personal.portfolio)
        doc.text(resume.personal.portfolio);
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
async function generateCoverLetterPDF(coverLetter, options = {}) {
    const tempDir = (0, node_path_1.join)((0, node_os_1.tmpdir)(), "careeros-pdf");
    if (!(0, node_fs_1.existsSync)(tempDir)) {
        (0, node_fs_1.mkdirSync)(tempDir, { recursive: true });
    }
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`;
    const filePath = (0, node_path_1.join)(tempDir, filename);
    const doc = new pdfkit_1.default({
        margins: { top: 72, bottom: 72, left: 72, right: 72 },
        info: {
            Title: "Cover Letter",
            Author: "CareerOS",
            Creator: "CareerOS",
        },
    });
    const stream = (0, node_fs_1.createWriteStream)(filePath);
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
function cleanupPDF(filePath) {
    try {
        if ((0, node_fs_1.existsSync)(filePath)) {
            (0, node_fs_1.unlinkSync)(filePath);
        }
    }
    catch (error) {
        console.error("Failed to cleanup PDF file:", error);
    }
}
