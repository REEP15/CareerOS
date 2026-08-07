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

export async function uploadScreenshot(userId: string, jobId: string, label: string): Promise<string> {
  throw new Error(
    `Cannot upload screenshot "${label}" for ${userId}/${jobId} without a browser page. Use captureAndUploadScreenshot instead.`,
  );
}

export async function getScreenshotUrl(userId: string, jobId: string, filename: string): Promise<string> {
  const storage = getFileStorage();
  const screenshotRef = ref(storage, `automation/${userId}/${jobId}/screenshots/${filename}`);
  return getDownloadURL(screenshotRef);
}

export async function listScreenshots(userId: string, jobId: string): Promise<string[]> {
  throw new Error(`Screenshot listing is not implemented for ${userId}/${jobId}.`);
}
