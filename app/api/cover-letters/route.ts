import { NextResponse } from "next/server";

import { getAuth } from "@/lib/firebase";
import { getCoverLetters } from "@/services/coverLetter/generator";

export async function GET() {
  try {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const coverLetters = await getCoverLetters(user.uid);
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
