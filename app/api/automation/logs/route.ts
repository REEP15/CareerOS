/**
 * API endpoint to fetch automation logs
 * GET /api/automation/logs?jobId=xxx&runId=xxx
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/shared/lib/server-auth";
import { automationLoggingService } from "@/services/apply/logging-service";

const WORKER_URL = process.env.WORKER_URL || 'http://localhost:3001';

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

    // Logs are stored in Firebase, can be fetched directly
    const logs = await automationLoggingService.getLogs(authResult.uid, jobId);

    return NextResponse.json({ success: true, logs });
  } catch (error) {
    console.error("Failed to fetch logs:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch logs" },
      { status: 500 }
    );
  }
}
