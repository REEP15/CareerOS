import { NextResponse } from "next/server";

import { verifyAuthToken } from "@/shared/lib/server-auth";
import { getCoverLetters } from "@/services/coverLetter/generator";

export async function GET(request: Request) {
  try {
    const authResult = await verifyAuthToken(request);

    if (!authResult) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const coverLetters = await getCoverLetters(authResult.uid);
    return NextResponse.json({ success: true, coverLetters });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch cover letters",
      },
      { status: 500 },
    );
  }
}
