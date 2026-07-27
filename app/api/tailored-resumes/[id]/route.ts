import { NextResponse } from "next/server";
import { doc, deleteDoc } from "firebase/firestore";
import { deleteObject, ref } from "firebase/storage";

import { verifyAuthToken } from "@/lib/server-auth";
import { getFileStorage, getDb } from "@/lib/firebase";
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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authResult = await verifyAuthToken(request);

    if (!authResult) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const versionLabel = url.searchParams.get("version");

    if (!versionLabel) {
      return NextResponse.json({ success: false, error: "Version label is required" }, { status: 400 });
    }

    const versions = await getTailoredResumeVersions(authResult.uid, id);
    const versionToDelete = versions.find((v) => v.versionLabel === versionLabel);

    if (!versionToDelete) {
      return NextResponse.json({ success: false, error: "Version not found" }, { status: 404 });
    }

    // Delete from Firestore
    await deleteDoc(doc(getDb(), `users/${authResult.uid}/tailoredResumes`, versionToDelete.id));

    // Delete from Firebase Storage if pdfUrl exists
    if (versionToDelete.pdfUrl) {
      try {
        const storageRef = ref(getFileStorage(), versionToDelete.pdfUrl);
        await deleteObject(storageRef);
      } catch (error) {
        console.error("Error deleting PDF from storage:", error);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete tailored resume version",
      },
      { status: 500 },
    );
  }
}
