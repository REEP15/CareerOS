"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicUrlToFilePath = publicUrlToFilePath;
exports.downloadFromUrl = downloadFromUrl;
exports.cleanupTempFile = cleanupTempFile;
const node_path_1 = __importDefault(require("node:path"));
const promises_1 = require("node:fs/promises");
const storage_1 = require("firebase/storage");
const firebase_1 = require("@/lib/firebase");
const node_url_1 = require("node:url");
function publicUrlToFilePath(url) {
    if (!url)
        return null;
    if (url.startsWith("file://")) {
        return (0, node_url_1.fileURLToPath)(url);
    }
    if (node_path_1.default.isAbsolute(url)) {
        return url;
    }
    try {
        const parsed = new URL(url, "http://example.com");
        if (parsed.protocol === "file:") {
            return (0, node_url_1.fileURLToPath)(url);
        }
        if (parsed.pathname.startsWith("/generated/")) {
            return node_path_1.default.join(process.cwd(), parsed.pathname.replace(/^\//, ""));
        }
    }
    catch {
        // Ignore invalid URL parsing.
    }
    if (url.startsWith("/generated/")) {
        return node_path_1.default.join(process.cwd(), url.replace(/^\//, ""));
    }
    return null;
}
async function downloadFromFirebaseStorage(storagePath) {
    try {
        const storage = (0, firebase_1.getFileStorage)();
        const normalizedPath = storagePath.startsWith("gs://")
            ? new URL(storagePath).pathname.replace(/^\//, "")
            : storagePath.startsWith("/")
                ? storagePath.replace(/^\//, "")
                : storagePath;
        const storageRef = (0, storage_1.ref)(storage, normalizedPath);
        const downloadUrl = await (0, storage_1.getDownloadURL)(storageRef);
        return await downloadFromUrl(downloadUrl);
    }
    catch (error) {
        console.error("Error downloading from Firebase Storage:", error);
        return null;
    }
}
async function downloadFromUrl(fileUrl) {
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
        const tempDir = node_path_1.default.join(process.cwd(), "temp");
        await (0, promises_1.mkdir)(tempDir, { recursive: true });
        const fileName = node_path_1.default.basename(new URL(fileUrl).pathname) || `download-${Date.now()}.pdf`;
        const tempFilePath = node_path_1.default.join(tempDir, fileName);
        await (0, promises_1.writeFile)(tempFilePath, buffer);
        return tempFilePath;
    }
    catch (error) {
        console.error("Error downloading file:", error);
        return null;
    }
}
async function cleanupTempFile(filePath) {
    try {
        await (0, promises_1.unlink)(filePath);
    }
    catch (error) {
        console.error("Error cleaning up temp file:", error);
    }
}
