/**
 * API endpoint to pause an active automation run
 * POST /api/automation/pause
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
    const { jobId, reason } = body;

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
      isAborted: () => false,
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
      page: undefined, // No page available for pause
    };

    const service = new AutomationService(deps, { userId: user.uid, jobId });
    await service.pause(reason || "User requested pause");

    return NextResponse.json({ success: true, message: "Automation paused" });
  } catch (error) {
    console.error("Automation pause error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to pause automation" },
      { status: 500 }
    );
  }
}
