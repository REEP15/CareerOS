/**
 * API endpoint to get the status of an automation run
 * GET /api/automation/status?runId=xxx
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/shared/lib/server-auth";

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
      return NextResponse.json({ error: "Missing required parameter: jobId" }, { status: 400 });
    }

    // Proxy to worker service
    const workerResponse = await fetch(`${WORKER_URL}/status/${runId || jobId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const workerData = await workerResponse.json();

    if (!workerResponse.ok) {
      throw new Error(workerData.error || 'Worker service error');
    }

    return NextResponse.json({ success: true, status: workerData.status });
  } catch (error) {
    console.error("Automation status error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get automation status" },
      { status: 500 }
    );
  }
}
