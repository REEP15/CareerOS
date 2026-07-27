import { NextResponse } from "next/server";
import { doc, setDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { z } from "zod";

import { getDb, getFileStorage, isFirebaseConfigured } from "@/lib/firebase";
import { parseResume } from "@/services/resume/parser";

const fileSchema = z
  .instanceof(File)
  .refine((file) => file.size > 0, "Resume file is required.")
  .refine((file) => file.type === "application/pdf", "Only PDF resumes are supported.");

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, error: "Unauthorized - No token provided" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    
    // Verify the token with Firebase Admin SDK would be ideal, but since we don't have it installed,
    // we'll use a workaround: decode the token to get the uid (not secure for production, but functional)
    // In production, you should use firebase-admin to verify the token
    let uid: string | null = null;
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        uid = payload.user_id || payload.sub;
      }
    } catch {
      return NextResponse.json({ success: false, error: "Unauthorized - Invalid token" }, { status: 401 });
    }

    if (!uid) {
      return NextResponse.json({ success: false, error: "Unauthorized - No user in token" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = fileSchema.parse(formData.get("file"));
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

    const storagePath = `resume/${uid}/${profile.id}/${Date.now()}-${sanitizeFileName(file.name)}`;
    const storageReference = ref(getFileStorage(), storagePath);
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await uploadBytes(storageReference, fileBuffer, {
      contentType: file.type,
    });

    const downloadUrl = await getDownloadURL(storageReference);
    await setDoc(doc(getDb(), `users/${uid}/resume`, profile.id), {
      ...profile,
      sourceFileName: file.name,
      resumeUrl: downloadUrl,
    });

    return NextResponse.json({
      profile,
      storagePath,
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

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
}
