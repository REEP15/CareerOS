/**
 * API endpoint to handle user confirmation responses
 * POST /api/automation/confirm
 * 
 * NOTE: This endpoint is now a proxy to the worker service.
 * The worker handles all browser automation and confirmation flows.
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
    const { jobId, runId, answer } = body;

    if (!jobId || !runId) {
      return NextResponse.json({ error: "Missing required fields: jobId, runId" }, { status: 400 });
    }

    // Proxy to worker service
    const workerResponse = await fetch(`${WORKER_URL}/api/automation/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': authResult.uid,
      },
      body: JSON.stringify({ jobId, runId, answer }),
    });

    const result = await workerResponse.json();

    if (!workerResponse.ok) {
      return NextResponse.json(result, { status: workerResponse.status });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Confirmation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process confirmation" },
      { status: 500 }
    );
  }
}
