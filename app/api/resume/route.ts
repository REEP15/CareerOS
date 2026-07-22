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

    const storagePath = `resume/${profile.id}/${Date.now()}-${sanitizeFileName(file.name)}`;
    const storageReference = ref(getFileStorage(), storagePath);
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await uploadBytes(storageReference, fileBuffer, {
      contentType: file.type,
    });

    const downloadUrl = await getDownloadURL(storageReference);
    await setDoc(doc(getDb(), "resume", profile.id), {
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
