/**
 * API endpoint to start automation for a job application
 * POST /api/automation/run
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase/auth";
import { AutomationService } from "@/services/apply/automation-service";
import { loadPrimaryResumeProfile } from "@/services/matcher/matcher";
import { generateResumePDF, generateCoverLetterPDF } from "@/services/files/pdf-generator";
import { uploadScreenshot } from "@/services/apply/screenshot-service";
import { requestUserConfirmation } from "@/services/apply/confirmation-service";

export async function POST(request: NextRequest) {
  try {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { jobId, confidenceThreshold } = body;

    if (!jobId) {
      return NextResponse.json({ error: "Missing required field: jobId" }, { status: 400 });
    }

    // Create automation service dependencies
    const deps = {
      userId: user.uid,
      jobId,
      runId: "", // Will be set by the service
      uploadScreenshot: async (label: string) => {
        // Placeholder - actual screenshot capture happens in the engine
        return uploadScreenshot(user.uid, jobId, label);
      },
      requestUserConfirmation: async (req: any) => {
        return requestUserConfirmation(user.uid, jobId, req);
      },
      isAborted: () => false, // TODO: Implement abort check
      logSink: (level: string, message: string, data?: any) => {
        console.log(`[${level.toUpperCase()}] ${message}`, data);
      },
      getResumeProfile: async () => {
        return loadPrimaryResumeProfile(user.uid);
      },
      generateResumePDF: async (resume: any) => {
        return generateResumePDF(resume);
      },
      generateCoverLetterPDF: async (content: string) => {
        return generateCoverLetterPDF(content);
      },
      page: undefined, // No page available initially
    };

    const service = new AutomationService(deps, { userId: user.uid, jobId, confidenceThreshold });
    const result = await service.run();

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("Automation run error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to run automation" },
      { status: 500 }
    );
  }
}
