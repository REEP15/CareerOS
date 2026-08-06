"use strict";
/**
 * Screenshot service - captures and stores screenshots during automation
 * Integrates with browser abstraction to capture actual screenshots
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.captureAndUploadScreenshot = captureAndUploadScreenshot;
exports.uploadScreenshot = uploadScreenshot;
exports.getScreenshotUrl = getScreenshotUrl;
exports.listScreenshots = listScreenshots;
const storage_1 = require("firebase/storage");
const firebase_1 = require("@/lib/firebase");
async function captureAndUploadScreenshot(page, userId, jobId, label) {
    try {
        // Capture screenshot from browser page
        const screenshotBuffer = await page.screenshot();
        const storage = (0, firebase_1.getFileStorage)();
        const filename = `${Date.now()}_${label.replace(/\s+/g, "_")}.png`;
        const screenshotRef = (0, storage_1.ref)(storage, `automation/${userId}/${jobId}/screenshots/${filename}`);
        // Upload to Firebase Storage
        await (0, storage_1.uploadBytes)(screenshotRef, screenshotBuffer);
        // Get download URL
        const downloadUrl = await (0, storage_1.getDownloadURL)(screenshotRef);
        return downloadUrl;
    }
    catch (error) {
        console.error("Failed to capture and upload screenshot:", error);
        throw new Error(`Screenshot capture failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
}
// Placeholder function for API endpoints that don't have page access
async function uploadScreenshot(userId, jobId, label) {
    // TODO: This is a placeholder for API endpoints
    // In production, the actual screenshot capture happens in the engine hooks
    return `screenshots/${Date.now()}_${label}.png`;
}
async function getScreenshotUrl(userId, jobId, filename) {
    const storage = (0, firebase_1.getFileStorage)();
    const screenshotRef = (0, storage_1.ref)(storage, `automation/${userId}/${jobId}/screenshots/${filename}`);
    return (0, storage_1.getDownloadURL)(screenshotRef);
}
async function listScreenshots(userId, jobId) {
    // TODO: Implement listing of screenshots from Firebase Storage
    // This would use listAll() from Firebase Storage
    return [];
}
