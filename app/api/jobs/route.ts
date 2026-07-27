import { NextResponse } from "next/server";

import { getAuth } from "@/lib/firebase";
import { getStoredJobs } from "@/services/collector/save";

export async function GET() {
  try {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const jobs = await getStoredJobs(user.uid);
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
