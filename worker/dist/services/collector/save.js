"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveCollectedJobs = saveCollectedJobs;
exports.getStoredJobs = getStoredJobs;
const firestore_1 = require("firebase/firestore");
const firebase_1 = require("@/lib/firebase");
const normalize_1 = require("../collector/normalize");
// Debug: Log which firebase/firestore module is being used
console.log('[worker/services/collector/save.ts] firebase/firestore module path:', require.resolve('firebase/firestore'));
console.log('[worker/services/collector/save.ts] firebase/app module path:', require.resolve('firebase/app'));
async function saveCollectedJobs(uid, jobs) {
    console.log('[worker/services/collector/save.ts] saveCollectedJobs called');
    if (!(0, firebase_1.isFirebaseConfigured)()) {
        throw new Error("Firebase environment variables are missing.");
    }
    const existingJobs = await getStoredJobs(uid);
    const seen = new Set(existingJobs.map((job) => (0, normalize_1.createJobDuplicateKey)(job)));
    let added = 0;
    let skipped = 0;
    for (const job of jobs) {
        const duplicateKey = (0, normalize_1.createJobDuplicateKey)(job);
        if (seen.has(duplicateKey)) {
            skipped += 1;
            continue;
        }
        seen.add(duplicateKey);
        console.log('[worker/services/collector/save.ts] About to call setDoc for job:', job.id);
        await (0, firestore_1.setDoc)((0, firestore_1.doc)((0, firebase_1.getUserJobsCollection)(uid), job.id), job);
        added += 1;
    }
    return { added, skipped };
}
async function getStoredJobs(uid) {
    if (!(0, firebase_1.isFirebaseConfigured)()) {
        return [];
    }
    const snapshot = await (0, firestore_1.getDocs)((0, firestore_1.query)((0, firebase_1.getUserJobsCollection)(uid), (0, firestore_1.orderBy)("scrapedAt", "desc")));
    return snapshot.docs.map((document) => document.data());
}
