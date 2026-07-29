import { NextResponse } from "next/server";
import { doc, setDoc, getDoc, deleteDoc } from "firebase/firestore";
import { z } from "zod";

import { getDb, isFirebaseConfigured } from "@/lib/firebase";
import { verifyAuthToken } from "@/lib/server-auth";
import { parseResume } from "@/services/resume/parser";
import type { ResumeProfile } from "@/types/resume";

const fileSchema = z
  .instanceof(File)
  .refine((file) => file.size > 0, "Resume file is required.")
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
    
    // Parse the resume server-side
    const profile = await parseResume(file);

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

    // Store ResumeProfile with UploadThing URL
    const resumeDoc = {
      ...profile,
      storagePath: uploadthingUrl, // Use UploadThing URL as storage path
      resumeUrl: uploadthingUrl,
      sourceFileName: file.name,
      uploadedAt: new Date().toISOString(),
      lastParsedAt: profile.lastParsedAt || new Date().toISOString(),
      parserVersion: profile.parserVersion || "1.0.0",
    };

    await setDoc(doc(getDb(), `users/${authResult.uid}/resume`, profile.id), resumeDoc);

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

    // Note: UploadThing file deletion would require API integration
    // For now, we only delete the Firestore record
    // The file remains in UploadThing storage

    await deleteDoc(docRef);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete resume" },
      { status: 500 },
    );
  }
}
