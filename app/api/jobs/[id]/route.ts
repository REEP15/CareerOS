import { NextResponse } from "next/server";

import { verifyAuthToken } from "@/lib/firebase";
import { loadApplicationPackage } from "@/services/apply/tracker";

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

    const applicationPackage = await loadApplicationPackage(authResult.uid, id);

    if (!applicationPackage) {
      return NextResponse.json({ success: false, error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, package: applicationPackage });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch job",
      },
      { status: 500 },
    );
  }
}
