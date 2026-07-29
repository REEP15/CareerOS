import path from "node:path";
import { writeFile, unlink } from "node:fs/promises";
import { getDownloadURL, ref } from "firebase/storage";
import { getFileStorage } from "@/lib/firebase";

export function publicUrlToFilePath(url: string | undefined) {
  if (!url?.startsWith("/generated/")) {
    return null;
  }

  return path.join(process.cwd(), "public", url.replace(/^\//, ""));
}

/**
 * Download a PDF from Firebase Storage to a temporary local file
 * This is needed for Playwright to upload files to job application forms
 */
export async function downloadFromFirebaseStorage(storagePath: string): Promise<string | null> {
  try {
    const storageRef = ref(getFileStorage(), storagePath);
    const downloadUrl = await getDownloadURL(storageRef);
    
    // Download the file
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      return null;
    }
    
    const buffer = Buffer.from(await response.arrayBuffer());
    
    // Create a temporary file path
    const tempDir = path.join(process.cwd(), "temp");
    const fileName = path.basename(storagePath);
    const tempFilePath = path.join(tempDir, fileName);
    
    // Write the file to temp directory
    await writeFile(tempFilePath, buffer);
    
    return tempFilePath;
  } catch (error) {
    console.error("Error downloading from Firebase Storage:", error);
    return null;
  }
}

/**
 * Download a PDF from UploadThing or Firebase Storage to a temporary local file
 * This is needed for Playwright to upload files to job application forms
 */
export async function downloadFromUrl(fileUrl: string): Promise<string | null> {
  try {
    const response = await fetch(fileUrl);
    if (!response.ok) {
      return null;
    }
    
    const buffer = Buffer.from(await response.arrayBuffer());
    
    // Create a temporary file path
    const tempDir = path.join(process.cwd(), "temp");
    const fileName = path.basename(new URL(fileUrl).pathname);
    const tempFilePath = path.join(tempDir, fileName);
    
    // Write the file to temp directory
    await writeFile(tempFilePath, buffer);
    
    return tempFilePath;
  } catch (error) {
    console.error("Error downloading file:", error);
    return null;
  }
}

/**
 * Clean up a temporary file
 */
export async function cleanupTempFile(filePath: string): Promise<void> {
  try {
    await unlink(filePath);
  } catch (error) {
    console.error("Error cleaning up temp file:", error);
  }
}
