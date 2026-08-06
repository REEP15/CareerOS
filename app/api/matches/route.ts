import { NextResponse } from "next/server";

import { verifyAuthToken } from "@/shared/lib/server-auth";
import { getStoredMatches } from "@/services/matcher/matcher";

export async function GET(request: Request) {
  try {
    const authResult = await verifyAuthToken(request);

    if (!authResult) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const matches = await getStoredMatches(authResult.uid);
    return NextResponse.json({ success: true, matches });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch matches",
      },
      { status: 500 },
    );
  }
}
