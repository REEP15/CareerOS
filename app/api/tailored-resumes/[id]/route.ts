import { NextResponse } from "next/server";

import { verifyAuthToken } from "@/lib/server-auth";
import { getTailoredResumeVersions } from "@/services/tailoring/tailor";

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

    const versions = await getTailoredResumeVersions(authResult.uid, id);
    return NextResponse.json({ success: true, versions });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch tailored resume versions",
      },
      { status: 500 },
    );
  }
}
