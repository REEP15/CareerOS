/**
 * API endpoint to get the status of an automation run
 * GET /api/automation/status?runId=xxx
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase/auth";
import { AutomationService } from "@/services/apply/automation-service";
import { loadPrimaryResumeProfile } from "@/services/matcher/matcher";
import { generateResumePDF, generateCoverLetterPDF } from "@/services/files/pdf-generator";
import { uploadScreenshot } from "@/services/apply/screenshot-service";
import { requestUserConfirmation } from "@/services/apply/confirmation-service";

export async function GET(request: NextRequest) {
  try {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");
    const runId = searchParams.get("runId");

    if (!jobId) {
      return NextResponse.json({ error: "Missing required parameter: jobId" }, { status: 400 });
    }

    // Create automation service dependencies
    const deps = {
      userId: user.uid,
      jobId,
      runId: runId || "", // Use the provided runId
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
      page: undefined, // No page available for status check
    };

    const service = new AutomationService(deps, { userId: user.uid, jobId });
    const status = await service.getStatus(runId || undefined);

    if (!status) {
      return NextResponse.json({ error: "Run status not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, status });
  } catch (error) {
    console.error("Automation status error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get automation status" },
      { status: 500 }
    );
  }
}
