import { NextResponse } from "next/server";

import { verifyAuthToken } from "@/lib/server-auth";
import { getDashboardMetrics } from "@/services/dashboard/metrics";

export async function GET(request: Request) {
  try {
    const authResult = await verifyAuthToken(request);

    if (!authResult) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const metrics = await getDashboardMetrics(authResult.uid);
    return NextResponse.json({ success: true, metrics });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch dashboard metrics",
      },
      { status: 500 },
    );
  }
}
