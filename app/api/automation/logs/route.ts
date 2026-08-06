/**
 * API endpoint to fetch automation logs
 * GET /api/automation/logs?jobId=xxx&runId=xxx
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

    return NextResponse.json({ success: true, logs });
  } catch (error) {
    console.error("Failed to fetch logs:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch logs" },
      { status: 500 }
    );
  }
}
