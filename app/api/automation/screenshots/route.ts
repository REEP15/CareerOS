/**
 * API endpoint to fetch automation screenshots
 * GET /api/automation/screenshots?jobId=xxx&runId=xxx
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/shared/lib/server-auth";
import { automationScreenshotService } from "@/services/apply/screenshot-service";

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);

    if (!authResult) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");
    const runId = searchParams.get("runId");

    if (!jobId) {
      return NextResponse.json({ error: "Missing required field: jobId" }, { status: 400 });
    }

    // Screenshots are stored in Firebase, can be fetched directly
    const screenshots = await automationScreenshotService.getScreenshots(authResult.uid, jobId);

    return NextResponse.json({ success: true, screenshots });
  } catch (error) {
    console.error("Failed to fetch screenshots:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch screenshots" },
      { status: 500 }
    );
  }
}
