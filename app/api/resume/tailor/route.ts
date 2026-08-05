import { NextResponse } from "next/server";
import { z } from "zod";

import { verifyAuthToken } from "@/lib/server-auth";
import { getDb } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { createApplicationPackageService } from "@/services/tailoring/package";
import type { ResumeProfile } from "@/types/resume";
import type { ApplicationPackage, ApplicationStatus } from "@/types/application";

const requestSchema = z.object({
  jobId: z.string().min(1),
  jobTitle: z.string().min(1),
  jobCompany: z.string().min(1),
  jobDescription: z.string().min(1),
  jobLocation: z.string().optional(),
  jobSalary: z.string().optional(),
  jobUrl: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const authResult = await verifyAuthToken(request);

    if (!authResult) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = requestSchema.parse(await request.json());
    const { jobId, jobTitle, jobCompany, jobDescription, jobLocation, jobSalary, jobUrl } = body;

    // Get user's resume
    const resumeRef = doc(getDb(), `users/${authResult.uid}/resume/primary`);
    const resumeSnapshot = await getDoc(resumeRef);

    if (!resumeSnapshot.exists()) {
      return NextResponse.json({ 
        success: false, 
        error: "No resume found. Please upload a resume first." 
      }, { status: 404 });
    }

    const resume = resumeSnapshot.data() as ResumeProfile;

    // Create application package
    const packageService = createApplicationPackageService();
    const applicationPackage = await packageService.createApplicationPackage(
      resume,
      {
        id: jobId,
        title: jobTitle,
        company: jobCompany,
        description: jobDescription,
        location: jobLocation,
        salary: jobSalary,
        url: jobUrl,
      }
    );

    return NextResponse.json({ 
      success: true, 
      applicationPackage 
    });

  } catch (error) {
    console.error("Resume tailoring error:", error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to tailor resume" 
    }, { status: 500 });
  }
}