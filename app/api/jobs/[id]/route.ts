import { NextResponse } from "next/server";

import { getAuth } from "@/lib/firebase";
import { loadApplicationPackage } from "@/services/apply/tracker";

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

    const applicationPackage = await loadApplicationPackage(user.uid, id);

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
