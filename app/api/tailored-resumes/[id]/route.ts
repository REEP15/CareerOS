import { NextResponse } from "next/server";
import { doc, deleteDoc } from "firebase/firestore";
import { deleteObject, ref } from "firebase/storage";

import { verifyAuthToken } from "@/shared/lib/server-auth";
import { getFileStorage, getDb } from "@/shared/lib/firebase";
import { createApplicationPackageService } from "@/services/tailoring/package";

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

    // Get application package
    const packageService = createApplicationPackageService();
    const applicationPackage = await packageService.getApplicationPackage(authResult.uid, id);

    if (!applicationPackage) {
      return NextResponse.json({ 
        success: false, 
        error: "Application package not found" 
      }, { status: 404 });
    }

    // Return tailored resume from package
    if (!applicationPackage.tailoredResume) {
      return NextResponse.json({ 
        success: false, 
        error: "Tailored resume not found in package" 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      tailoredResume: applicationPackage.tailoredResume.profile,
      generatedAt: applicationPackage.tailoredResume.createdAt
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch tailored resume",
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

    // Delete application package
    const packageRef = doc(getDb(), `users/${authResult.uid}/application-packages/${id}`);
    await deleteDoc(packageRef);

    return NextResponse.json({ 
      success: true, 
      message: "Application package deleted successfully" 
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete application package",
      },
      { status: 500 },
    );
  }
}