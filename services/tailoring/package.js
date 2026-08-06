"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplicationPackageService = void 0;
exports.createApplicationPackageService = createApplicationPackageService;
const firestore_1 = require("firebase/firestore");
const firebase_1 = require("@/shared/lib/firebase");
const tailor_1 = require("./tailor");
const generator_1 = require("../cover-letter/generator");
const analyzer_1 = require("../ats/analyzer");
/**
 * Application Package Orchestrator
 * Creates complete application packages containing tailored resume, cover letter, and ATS analysis
 */
class ApplicationPackageService {
    constructor() {
        this.resumeTailor = (0, tailor_1.createResumeTailor)();
        this.coverLetterGenerator = (0, generator_1.createCoverLetterGenerator)();
        this.atsAnalyzer = (0, analyzer_1.createATSAnalyzer)();
    }
    /**
     * Creates a complete application package for a job
     */
    async createApplicationPackage(originalResume, job, options) {
        const userId = originalResume.id; // Use resume ID as user context
        // 1. Generate tailored resume
        const tailoredResume = await this.resumeTailor.tailorResume(originalResume, job.description, { title: job.title, company: job.company }, (options === null || options === void 0 ? void 0 : options.tailoring) || {});
        // 2. Generate cover letter
        const coverLetter = await this.coverLetterGenerator.generateCoverLetter(originalResume, job.description, { title: job.title, company: job.company }, (options === null || options === void 0 ? void 0 : options.coverLetter) || {});
        // 3. Perform ATS analysis
        const atsAnalysis = await this.atsAnalyzer.analyzeATS(originalResume, tailoredResume, job.description, (options === null || options === void 0 ? void 0 : options.ats) || {});
        // 4. Create application package
        const applicationPackage = {
            id: job.id,
            userId,
            job: {
                id: job.id,
                title: job.title,
                company: job.company,
                description: job.description,
                location: job.location,
                salary: job.salary,
                url: job.url,
                source: job.source,
                applyUrl: job.applyUrl,
            },
            tailoredResume: {
                id: `tailored-${job.id}`,
                jobId: job.id,
                version: 1,
                versionLabel: "v1",
                profile: tailoredResume,
                diff: {
                    summary: { before: "", after: "" },
                    skills: { before: [], after: [] },
                    prioritizedProjects: [],
                    keywordOptimizations: [],
                },
                pdfUrl: "",
                createdAt: new Date().toISOString(),
            },
            coverLetter: {
                id: `cover-${job.id}`,
                jobId: job.id,
                version: 1,
                versionLabel: "v1",
                company: job.company,
                role: job.title,
                content: coverLetter,
                pdfUrl: "",
                createdAt: new Date().toISOString(),
            },
            atsAnalysis,
            originalResumeId: originalResume.id,
            status: "draft",
            generatedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        // 5. Store in Firestore
        await this.saveApplicationPackage(applicationPackage);
        return applicationPackage;
    }
    /**
     * Saves application package to Firestore
     */
    async saveApplicationPackage(pkg) {
        const packageRef = (0, firestore_1.doc)((0, firebase_1.getDb)(), `users/${pkg.userId}/application-packages/${pkg.id}`);
        await (0, firestore_1.setDoc)(packageRef, pkg);
    }
    /**
     * Retrieves an application package by ID
     */
    async getApplicationPackage(userId, packageId) {
        const packageRef = (0, firestore_1.doc)((0, firebase_1.getDb)(), `users/${userId}/application-packages/${packageId}`);
        const snapshot = await (0, firestore_1.getDoc)(packageRef);
        if (!snapshot.exists()) {
            return null;
        }
        return snapshot.data();
    }
    /**
     * Updates application package status
     */
    async updatePackageStatus(userId, packageId, status) {
        const packageRef = (0, firestore_1.doc)((0, firebase_1.getDb)(), `users/${userId}/application-packages/${packageId}`);
        await (0, firestore_1.setDoc)(packageRef, { status, updatedAt: new Date().toISOString() }, { merge: true });
    }
    /**
     * Updates cover letter in application package
     */
    async updateCoverLetter(userId, packageId, editedContent) {
        const packageRef = (0, firestore_1.doc)((0, firebase_1.getDb)(), `users/${userId}/application-packages/${packageId}`);
        await (0, firestore_1.setDoc)(packageRef, {
            coverLetter: {
                content: editedContent,
                generatedAt: new Date().toISOString(), // Keep original generation time
                editedAt: new Date().toISOString(),
            },
            updatedAt: new Date().toISOString(),
        }, { merge: true });
    }
    /**
     * Lists all application packages for a user
     */
    async listApplicationPackages(userId) {
        const packagesRef = (0, firestore_1.collection)((0, firebase_1.getDb)(), `users/${userId}/application-packages`);
        const snapshot = await (0, firestore_1.getDocs)(packagesRef);
        const packages = [];
        snapshot.forEach((doc) => {
            packages.push(doc.data());
        });
        return packages.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
    }
}
exports.ApplicationPackageService = ApplicationPackageService;
/**
 * Factory function to create application package service
 */
function createApplicationPackageService() {
    return new ApplicationPackageService();
}
