import { NextResponse } from "next/server";
import { z } from "zod";

import { verifyAuthToken } from "@/lib/server-auth";
import { getDb } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { createApplicationPackageService } from "@/services/tailoring/package";
import { createCoverLetterGenerator } from "@/services/cover-letter/generator";
import type { ResumeProfile } from "@/types/resume";
import type { ApplicationPackage } from "@/types/application";

const requestSchema = z.object({
  jobId: z.string().min(1),
  jobTitle: z.string().min(1),
  jobCompany: z.string().min(1),
  jobDescription: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const authResult = await verifyAuthToken(request);

    if (!authResult) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { jobId, jobTitle, jobCompany, jobDescription } = requestSchema.parse(await request.json());

    // Get application package
    const packageService = createApplicationPackageService();
    const applicationPackage = await packageService.getApplicationPackage(authResult.uid, jobId);

    if (!applicationPackage) {
      return NextResponse.json({ 
        success: false, 
        error: "Application package not found. Please generate tailored resume first." 
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

    // Generate cover letter
    const coverLetterGenerator = createCoverLetterGenerator();
    const newCoverLetter = await coverLetterGenerator.generateCoverLetter(
      resume,
      jobDescription,
      { title: jobTitle, company: jobCompany }
    );

    // Update application package with new cover letter
    const packageRef = doc(getDb(), `users/${authResult.uid}/application-packages/${jobId}`);
    await setDoc(packageRef, {
      coverLetter: {
        content: newCoverLetter,
        generatedAt: new Date().toISOString(),
      },
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    return NextResponse.json({ 
      success: true, 
      message: "Cover letter generated successfully"
    });

  } catch (error) {
    console.error("Cover letter generation error:", error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to generate cover letter" 
    }, { status: 500 });
  }
}