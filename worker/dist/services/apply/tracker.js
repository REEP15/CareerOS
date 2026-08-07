"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStoredApplications = getStoredApplications;
exports.getApplication = getApplication;
exports.upsertApplication = upsertApplication;
exports.loadApplicationPackage = loadApplicationPackage;
const firestore_1 = require("firebase/firestore");
const firebase_1 = require("@/lib/firebase");
const application_1 = require("@/types/application");
const package_1 = require("../tailoring/package");
async function getStoredApplications(uid) {
    const db = (0, firebase_1.getDb)();
    const applicationsCollection = (0, firestore_1.collection)(db, `users/${uid}/applications`);
    const snapshot = await (0, firestore_1.getDocs)((0, firestore_1.query)(applicationsCollection, (0, firestore_1.orderBy)("updatedAt", "desc")));
    return snapshot.docs.map((doc) => doc.data());
}
async function getApplication(uid, jobId) {
    const db = (0, firebase_1.getDb)();
    const docRef = (0, firestore_1.doc)(db, `users/${uid}/applications/${jobId}`);
    const snapshot = await (0, firestore_1.getDoc)(docRef);
    return snapshot.exists() ? snapshot.data() : null;
}
async function upsertApplication(uid, input) {
    var _a, _b, _c, _d;
    const db = (0, firebase_1.getDb)();
    const docRef = (0, firestore_1.doc)(db, `users/${uid}/applications/${input.jobId}`);
    const snapshot = await (0, firestore_1.getDoc)(docRef);
    const now = new Date().toISOString();
    const existing = snapshot.exists() ? snapshot.data() : {
        id: input.jobId,
        userId: uid,
        jobId: input.jobId,
        status: application_1.ApplicationStatus.NOT_APPLIED,
        createdAt: now,
        updatedAt: now,
    };
    const updated = {
        ...existing,
        status: input.status,
        resumeVersion: (_a = input.resumeVersion) !== null && _a !== void 0 ? _a : existing.resumeVersion,
        coverLetterVersion: (_b = input.coverLetterVersion) !== null && _b !== void 0 ? _b : existing.coverLetterVersion,
        notes: (_c = input.notes) !== null && _c !== void 0 ? _c : existing.notes,
        updatedAt: now,
        createdAt: existing.createdAt || now,
        timeline: [
            ...((_d = existing.timeline) !== null && _d !== void 0 ? _d : []),
            {
                id: `${Date.now()}`,
                applicationId: input.jobId,
                type: snapshot.exists() ? "updated" : "created",
                timestamp: now,
                details: input.timelineNote,
                status: input.status,
                note: input.timelineNote,
            },
        ],
    };
    await (0, firestore_1.setDoc)(docRef, updated, { merge: true });
    return updated;
}
async function loadApplicationPackage(uid, jobId) {
    var _a, _b;
    const packageService = (0, package_1.createApplicationPackageService)();
    const storedPackage = await packageService.getApplicationPackage(uid, jobId);
    if (!storedPackage) {
        throw new Error("Application package not found.");
    }
    if (!storedPackage.job) {
        throw new Error("Application package missing job metadata.");
    }
    if (!storedPackage.tailoredResume) {
        throw new Error("Application package missing tailored resume.");
    }
    return {
        application: {
            id: storedPackage.id,
            userId: storedPackage.userId,
            jobId: storedPackage.id,
            status: storedPackage.status === "draft" ? application_1.ApplicationStatus.NOT_APPLIED : storedPackage.status,
            createdAt: storedPackage.generatedAt,
            updatedAt: storedPackage.updatedAt,
            resumeVersion: storedPackage.tailoredResume.versionLabel,
            coverLetterVersion: (_a = storedPackage.coverLetter) === null || _a === void 0 ? void 0 : _a.versionLabel,
            appliedAt: storedPackage.status === "submitted" ? storedPackage.updatedAt : undefined,
        },
        coverLetter: storedPackage.coverLetter
            ? {
                versionLabel: storedPackage.coverLetter.versionLabel,
                content: storedPackage.coverLetter.content,
                pdfUrl: storedPackage.coverLetter.pdfUrl,
            }
            : null,
        job: {
            id: storedPackage.job.id,
            title: storedPackage.job.title,
            company: storedPackage.job.company,
            location: storedPackage.job.location || "",
            salary: storedPackage.job.salary || "",
            description: storedPackage.job.description,
            applyUrl: storedPackage.job.applyUrl || "",
            source: storedPackage.job.source || "",
            scrapedAt: storedPackage.generatedAt,
        },
        match: (_b = storedPackage.match) !== null && _b !== void 0 ? _b : null,
        tailoredResume: {
            versionLabel: storedPackage.tailoredResume.versionLabel,
            content: storedPackage.tailoredResume.profile,
            pdfUrl: storedPackage.tailoredResume.pdfUrl,
            diff: storedPackage.tailoredResume.diff,
        },
    };
}
