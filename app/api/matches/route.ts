import { NextResponse } from "next/server";

import { getAuth } from "@/lib/firebase";
import { getStoredMatches } from "@/services/matcher/matcher";

export async function GET() {
  try {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const matches = await getStoredMatches(user.uid);
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
