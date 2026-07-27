import { NextResponse } from "next/server";

import { getAuth } from "@/lib/firebase";
import { getTailoredResumeVersions } from "@/services/tailoring/tailor";

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

    const versions = await getTailoredResumeVersions(user.uid, id);
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
