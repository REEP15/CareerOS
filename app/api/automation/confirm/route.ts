/**
 * API endpoint to handle user confirmation responses
 * POST /api/automation/confirm
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/shared/lib/server-auth";
import { handleUserConfirmation } from "@/services/apply/confirmation-service";

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);

    if (!authResult) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { jobId, runId, answer } = body;

    if (!jobId || !runId) {
      return NextResponse.json({ error: "Missing required fields: jobId, runId" }, { status: 400 });
    }

    // Handle confirmation directly using confirmation service
    const result = await handleUserConfirmation(authResult.uid, jobId, runId, answer);

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("Confirmation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process confirmation" },
      { status: 500 }
    );
  }
}
