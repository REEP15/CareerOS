import { NextResponse } from "next/server";
import { z } from "zod";

import { verifyAuthToken } from "@/lib/server-auth";
import { getDb } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { createApplicationPackageService } from "@/services/tailoring/package";
import { createCoverLetterGenerator } from "@/services/cover-letter/generator";
import type { ResumeProfile } from "@/types/resume";
import type { ApplicationPackage } from "@/types/application";

const requestSchema = z.object({
  jobId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const authResult = await verifyAuthToken(request);

    if (!authResult) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { jobId } = requestSchema.parse(await request.json());

    // Get application package
    const packageService = createApplicationPackageService();
    const applicationPackage = await packageService.getApplicationPackage(authResult.uid, jobId);

    if (!applicationPackage) {
      return NextResponse.json({ 
        success: false, 
        error: "Application package not found. Please generate application package first." 
      }, { status: 404 });
    }

    // Get original resume
    const resumeRef = doc(getDb(), `users/${authResult.uid}/resume/primary`);
    const resumeSnapshot = await getDoc(resumeRef);

    if (!resumeSnapshot.exists()) {
      return NextResponse.json({ 
        success: false, 
        error: "No resume found. Please upload a resume first." 
      }, { status: 404 });
    }

    const resume = resumeSnapshot.data() as ResumeProfile;

    // Regenerate cover letter
    const coverLetterGenerator = createCoverLetterGenerator();
    const newCoverLetter = await coverLetterGenerator.generateCoverLetter(
      resume,
      applicationPackage.job.description,
      { title: applicationPackage.job.title, company: applicationPackage.job.company }
    );

    // Update application package with new cover letter
    await packageService.updateCoverLetter(authResult.uid, jobId, newCoverLetter);

    return NextResponse.json({ 
      success: true, 
      coverLetter: newCoverLetter 
    });

  } catch (error) {
    console.error("Cover letter generation error:", error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to generate cover letter" 
    }, { status: 500 });
  }
}