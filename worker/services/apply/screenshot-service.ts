/**
 * Screenshot service - captures and stores screenshots during automation
 * Integrates with browser abstraction to capture actual screenshots
 */

import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFileStorage } from "@/lib/firebase";
import type { BrowserPage } from "@/types/browser";

export async function captureAndUploadScreenshot(
  page: BrowserPage,
  userId: string,
  jobId: string,
  label: string
): Promise<string> {
  try {
    // Capture screenshot from browser page
    const screenshotBuffer = await page.screenshot();
    
    const storage = getFileStorage();
    const filename = `${Date.now()}_${label.replace(/\s+/g, "_")}.png`;
    const screenshotRef = ref(storage, `automation/${userId}/${jobId}/screenshots/${filename}`);
    
    // Upload to Firebase Storage
    await uploadBytes(screenshotRef, screenshotBuffer);
    
    // Get download URL
    const downloadUrl = await getDownloadURL(screenshotRef);
    
    return downloadUrl;
  } catch (error) {
    console.error("Failed to capture and upload screenshot:", error);
    throw new Error(`Screenshot capture failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

// Placeholder function for API endpoints that don't have page access
export async function uploadScreenshot(userId: string, jobId: string, label: string): Promise<string> {
  // TODO: This is a placeholder for API endpoints
  // In production, the actual screenshot capture happens in the engine hooks
  return `screenshots/${Date.now()}_${label}.png`;
}

export async function getScreenshotUrl(userId: string, jobId: string, filename: string): Promise<string> {
  const storage = getFileStorage();
  const screenshotRef = ref(storage, `automation/${userId}/${jobId}/screenshots/${filename}`);
  return getDownloadURL(screenshotRef);
}

export async function listScreenshots(userId: string, jobId: string): Promise<string[]> {
  // TODO: Implement listing of screenshots from Firebase Storage
  // This would use listAll() from Firebase Storage
  return [];
}
