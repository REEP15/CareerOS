import { NextResponse } from "next/server";

import { verifyAuthToken } from "@/lib/server-auth";
import { getStoredJobs } from "@/services/collector/save";

export async function GET(request: Request) {
  try {
    const authResult = await verifyAuthToken(request);

    if (!authResult) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const jobs = await getStoredJobs(authResult.uid);
    return NextResponse.json({ success: true, jobs });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch jobs",
      },
      { status: 500 },
    );
  }
}
