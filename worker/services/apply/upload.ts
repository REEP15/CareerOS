import path from "node:path";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { getDownloadURL, ref } from "firebase/storage";
import { getFileStorage } from "@/lib/firebase";
import { fileURLToPath } from "node:url";

export function publicUrlToFilePath(url: string | undefined): string | null {
  if (!url) return null;

  if (url.startsWith("file://")) {
    return fileURLToPath(url);
  }

  if (path.isAbsolute(url)) {
    return url;
  }

  try {
    const parsed = new URL(url, "http://example.com");
    if (parsed.protocol === "file:") {
      return fileURLToPath(url);
    }
    if (parsed.pathname.startsWith("/generated/")) {
      return path.join(process.cwd(), parsed.pathname.replace(/^\//, ""));
    }
  } catch {
    // Ignore invalid URL parsing.
  }

  if (url.startsWith("/generated/")) {
    return path.join(process.cwd(), url.replace(/^\//, ""));
  }

  return null;
}

async function downloadFromFirebaseStorage(storagePath: string): Promise<string | null> {
  try {
    const storage = getFileStorage();
    const normalizedPath = storagePath.startsWith("gs://")
      ? new URL(storagePath).pathname.replace(/^\//, "")
      : storagePath.startsWith("/")
      ? storagePath.replace(/^\//, "")
      : storagePath;

    const storageRef = ref(storage, normalizedPath);
    const downloadUrl = await getDownloadURL(storageRef);
    return await downloadFromUrl(downloadUrl);
  } catch (error) {
    console.error("Error downloading from Firebase Storage:", error);
    return null;
  }
}

export async function downloadFromUrl(fileUrl: string): Promise<string | null> {
  if (!fileUrl) {
    return null;
  }

  const localPath = publicUrlToFilePath(fileUrl);
  if (localPath) {
    return localPath;
  }

  if (fileUrl.startsWith("gs://") || (!fileUrl.startsWith("http://") && !fileUrl.startsWith("https://") && !fileUrl.startsWith("file://"))) {
    return downloadFromFirebaseStorage(fileUrl);
  }

  try {
    const response = await fetch(fileUrl);
    if (!response.ok) {
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const tempDir = path.join(process.cwd(), "temp");
    await mkdir(tempDir, { recursive: true });
    const fileName = path.basename(new URL(fileUrl).pathname) || `download-${Date.now()}.pdf`;
    const tempFilePath = path.join(tempDir, fileName);
    await writeFile(tempFilePath, buffer);
    return tempFilePath;
  } catch (error) {
    console.error("Error downloading file:", error);
    return null;
  }
}

export async function cleanupTempFile(filePath: string): Promise<void> {
  try {
    await unlink(filePath);
  } catch (error) {
    console.error("Error cleaning up temp file:", error);
  }
}
