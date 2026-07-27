import { NextResponse } from "next/server";

import { getAuth } from "@/lib/firebase";
import { getTailoredResumes } from "@/services/tailoring/tailor";

export async function GET() {
  try {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const resumes = await getTailoredResumes(user.uid);
    return NextResponse.json({ success: true, resumes });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch tailored resumes",
      },
      { status: 500 },
    );
  }
}
