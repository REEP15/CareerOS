/**
 * API endpoint to fetch automation screenshots
 * GET /api/automation/screenshots?jobId=xxx&runId=xxx
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase/auth";
import { automationLoggingService } from "@/services/apply/logging-service";

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
      return NextResponse.json({ error: "Missing required field: jobId" }, { status: 400 });
    }

    const logs = await automationLoggingService.getLogsByRun(user.uid, jobId, runId || undefined);
    
    // Filter logs that have screenshot URLs
    const screenshots = logs
      .filter((log) => log.screenshotUrl)
      .map((log) => ({
        id: log.id || `${log.timestamp}`,
        url: log.screenshotUrl!,
        label: log.data?.label as string || log.message,
        timestamp: log.timestamp,
      }));

    return NextResponse.json({ success: true, screenshots });
  } catch (error) {
    console.error("Failed to fetch screenshots:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch screenshots" },
      { status: 500 }
    );
  }
}
