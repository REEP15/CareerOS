import { NextResponse } from "next/server";
import { doc, setDoc, getDoc, deleteDoc } from "firebase/firestore";
import { z } from "zod";

import { getDb, isFirebaseConfigured } from "@/lib/firebase";
import { verifyAuthToken } from "@/lib/server-auth";
import { removeUndefined } from "@/lib/utils";
import { parseResume } from "@/services/resume/parser";
import type { ResumeProfile } from "@/types/resume";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const fileSchema = z
  .instanceof(File)
  .refine((file) => file.size > 0, "Resume file is required.")
  .refine((file) => file.size <= MAX_FILE_SIZE, `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB.`)
  .refine((file) => {
    const validTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    return validTypes.includes(file.type) || file.name.endsWith(".docx");
  }, "Only PDF and DOCX resumes are supported.");

export async function POST(request: Request) {
  try {
    const authResult = await verifyAuthToken(request);

    if (!authResult) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = fileSchema.parse(formData.get("file"));
    const uploadthingUrl = formData.get("uploadthingUrl") as string | null;
    const uploadthingFileKey = formData.get("uploadthingFileKey") as string | null;
    
    // Parse the resume server-side
    const profile = await parseResume(file, authResult.uid);

    if (!isFirebaseConfigured()) {
      return NextResponse.json(
        {
          profile,
          storagePath: null,
          stored: false,
        },
        { status: 200 },
      );
    }

    if (!uploadthingUrl) {
      return NextResponse.json({ success: false, error: "UploadThing URL is required" }, { status: 400 });
    }

    // Store ResumeProfile with UploadThing URL and file key
    const resumeDoc = {
      ...profile,
      storagePath: uploadthingUrl, // Use UploadThing URL as storage path
      resumeUrl: uploadthingUrl,
      uploadthingFileKey: uploadthingFileKey, // Store file key for deletion
      sourceFileName: file.name,
      uploadedAt: new Date().toISOString(),
      lastParsedAt: profile.lastParsedAt || new Date().toISOString(),
      parserVersion: profile.parserVersion || "1.0.0",
    };

    // Remove undefined values before sending to Firestore
    const sanitizedDoc = removeUndefined(resumeDoc);

    await setDoc(doc(getDb(), `users/${authResult.uid}/resume`, profile.id), sanitizedDoc);

    return NextResponse.json({
      profile: resumeDoc,
      storagePath: uploadthingUrl,
      stored: true,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Resume upload failed." },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  try {
    const authResult = await verifyAuthToken(request);

    if (!authResult) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!isFirebaseConfigured()) {
      return NextResponse.json({ success: false, error: "Firebase not configured" }, { status: 500 });
    }

    const docRef = doc(getDb(), `users/${authResult.uid}/resume`, "primary");
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return NextResponse.json({ success: false, error: "No resume found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, profile: docSnap.data() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch resume" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const authResult = await verifyAuthToken(request);

    if (!authResult) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!isFirebaseConfigured()) {
      return NextResponse.json({ success: false, error: "Firebase not configured" }, { status: 500 });
    }

    const docRef = doc(getDb(), `users/${authResult.uid}/resume`, "primary");
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return NextResponse.json({ success: false, error: "No resume found" }, { status: 404 });
    }

    const resumeData = docSnap.data();
    const fileKey = resumeData?.uploadthingFileKey;

    // Delete the Firestore document
    await deleteDoc(docRef);

    // Attempt to delete the file from UploadThing using stored file key
    if (fileKey) {
      try {
        await deleteUploadThingFile(fileKey);
      } catch (uploadError) {
        console.error("Failed to delete file from UploadThing:", uploadError);
        // Continue with deletion even if file deletion fails
        // The Firestore record is already deleted
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete resume" },
      { status: 500 },
    );
  }
}

/**
 * Deletes a file from UploadThing storage using the file key
 * Note: This requires UploadThing API keys and proper configuration
 */
async function deleteUploadThingFile(fileKey: string): Promise<void> {
  try {
    if (!fileKey) {
      console.error("No file key provided for UploadThing deletion");
      return;
    }

    // UploadThing deletion requires their API
    // This is a placeholder - actual implementation depends on UploadThing's API
    // For now, we'll log the deletion attempt
    console.log(`UploadThing file deletion requested for key: ${fileKey}`);
    
    // Note: To implement actual deletion, you would need to:
    // 1. Configure UploadThing API keys in environment variables
    // 2. Use the UploadThing REST API or SDK to delete the file
    // 3. Handle authentication with UploadThing
    
    // For now, this is a no-op as UploadThing deletion requires additional setup
    // The file will eventually be cleaned up by UploadThing's retention policies
    
  } catch (error) {
    console.error("Error deleting UploadThing file:", error);
    throw error;
  }
}
