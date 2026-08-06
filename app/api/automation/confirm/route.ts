/**
 * API endpoint to handle user confirmation responses
 * POST /api/automation/confirm
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
    const { jobId, runId, answer } = body;

    if (!jobId || !runId) {
      return NextResponse.json({ error: "Missing required fields: jobId, runId" }, { status: 400 });
    }

    // In a real implementation, this would update the confirmation service
    // For now, we'll just acknowledge the response
    return NextResponse.json({ success: true, acknowledged: true });
  } catch (error) {
    console.error("Confirmation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process confirmation" },
      { status: 500 }
    );
  }
}
