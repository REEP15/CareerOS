/**
 * API endpoint to cancel an active automation run
 * POST /api/automation/cancel
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/shared/lib/server-auth";

const WORKER_URL = process.env.WORKER_URL || 'http://localhost:3001';

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);

    if (!authResult) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { jobId, runId } = body;

    if (!jobId) {
      return NextResponse.json({ error: "Missing required field: jobId" }, { status: 400 });
    }

    // Proxy to worker service
    const workerResponse = await fetch(`${WORKER_URL}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uid: authResult.uid, jobId, runId }),
    });

    const workerData = await workerResponse.json();

    if (!workerResponse.ok) {
      throw new Error(workerData.error || 'Worker service error');
    }

    return NextResponse.json({ success: true, ...workerData });
  } catch (error) {
    console.error("Automation cancel error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to cancel automation" },
      { status: 500 }
    );
  }
}
