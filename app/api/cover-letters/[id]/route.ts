import { NextResponse } from "next/server";

import { getAuth } from "@/lib/firebase";
import { getCoverLetterVersions } from "@/services/coverLetter/generator";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const versions = await getCoverLetterVersions(user.uid, id);
    return NextResponse.json({ success: true, versions });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch cover letter versions",
      },
      { status: 500 },
    );
  }
}
