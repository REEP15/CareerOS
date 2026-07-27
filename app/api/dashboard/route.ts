import { NextResponse } from "next/server";

import { getAuth } from "@/lib/firebase";
import { getDashboardMetrics } from "@/services/dashboard/metrics";

export async function GET() {
  try {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const metrics = await getDashboardMetrics(user.uid);
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
