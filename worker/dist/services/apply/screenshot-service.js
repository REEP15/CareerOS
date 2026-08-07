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
async function uploadScreenshot(userId, jobId, label) {
    throw new Error(`Cannot upload screenshot "${label}" for ${userId}/${jobId} without a browser page. Use captureAndUploadScreenshot instead.`);
}
async function getScreenshotUrl(userId, jobId, filename) {
    const storage = (0, firebase_1.getFileStorage)();
    const screenshotRef = (0, storage_1.ref)(storage, `automation/${userId}/${jobId}/screenshots/${filename}`);
    return (0, storage_1.getDownloadURL)(screenshotRef);
}
async function listScreenshots(userId, jobId) {
    throw new Error(`Screenshot listing is not implemented for ${userId}/${jobId}.`);
}
