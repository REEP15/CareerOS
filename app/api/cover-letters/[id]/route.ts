import { NextResponse } from "next/server";

import { verifyAuthToken } from "@/shared/lib/server-auth";
import { getCoverLetterVersions } from "@/services/coverLetter/generator";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authResult = await verifyAuthToken(request);

    if (!authResult) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const versions = await getCoverLetterVersions(authResult.uid, id);
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
