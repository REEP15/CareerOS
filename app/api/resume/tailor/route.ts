import { NextResponse } from "next/server";
import { z } from "zod";

import { verifyAuthToken } from "@/lib/server-auth";
import { getDb } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { createApplicationPackageService } from "@/services/tailoring/package";
import { createResumeTailor } from "@/services/tailoring/tailor";
import { createATSAnalyzer } from "@/services/ats/analyzer";
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

    // Generate tailored resume
    const resumeTailor = createResumeTailor();
    const tailoredResume = await resumeTailor.tailorResume(
      resume,
      jobDescription,
      { title: jobTitle, company: jobCompany },
      {}
    );

    // Generate ATS analysis
    const atsAnalyzer = createATSAnalyzer();
    const atsAnalysis = await atsAnalyzer.analyzeATS(
      resume,
      tailoredResume,
      jobDescription,
      {}
    );

    // Check if application package exists
    const packageService = createApplicationPackageService();
    const existingPackage = await packageService.getApplicationPackage(authResult.uid, jobId);

    if (existingPackage) {
      // Update existing package
      const packageRef = doc(getDb(), `users/${authResult.uid}/application-packages/${jobId}`);
      await setDoc(packageRef, {
        tailoredResume: {
          id: `tailored-${jobId}`,
          content: tailoredResume,
          generatedAt: new Date().toISOString(),
        },
        atsAnalysis: {
          originalScore: atsAnalysis.originalScore,
          tailoredScore: atsAnalysis.tailoredScore,
          keywordCoverage: atsAnalysis.keywordCoverage,
          matchedKeywords: atsAnalysis.matchedKeywords,
          missingKeywords: atsAnalysis.missingKeywords,
          strengths: atsAnalysis.strengths,
          weaknesses: atsAnalysis.weaknesses,
          suggestions: atsAnalysis.suggestions,
          analysis: atsAnalysis.analysis,
        },
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } else {
      // Create new application package
      const applicationPackage = {
        id: jobId,
        userId: authResult.uid,
        status: "draft" as const,
        generatedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        job: {
          id: jobId,
          title: jobTitle,
          company: jobCompany,
          description: jobDescription,
          location: jobLocation,
          salary: jobSalary,
          url: jobUrl,
        },
        tailoredResume: {
          id: `tailored-${jobId}`,
          content: tailoredResume,
          generatedAt: new Date().toISOString(),
        },
        coverLetter: {
          content: "",
          generatedAt: new Date().toISOString(),
        },
        atsAnalysis: {
          originalScore: atsAnalysis.originalScore,
          tailoredScore: atsAnalysis.tailoredScore,
          keywordCoverage: atsAnalysis.keywordCoverage,
          matchedKeywords: atsAnalysis.matchedKeywords,
          missingKeywords: atsAnalysis.missingKeywords,
          strengths: atsAnalysis.strengths,
          weaknesses: atsAnalysis.weaknesses,
          suggestions: atsAnalysis.suggestions,
          analysis: atsAnalysis.analysis,
        },
        originalResumeId: resumeSnapshot.id,
      };

      await packageService.saveApplicationPackage(applicationPackage);
    }

    return NextResponse.json({ 
      success: true, 
      message: "Tailored resume generated successfully"
    });

  } catch (error) {
    console.error("Resume tailoring error:", error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to tailor resume" 
    }, { status: 500 });
  }
}