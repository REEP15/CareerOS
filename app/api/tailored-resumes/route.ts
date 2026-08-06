import { NextResponse } from "next/server";
import { doc, setDoc, getDoc, deleteDoc } from "firebase/firestore";
import { verifyAuthToken } from "@/lib/server-auth";
import { getDb } from "@/lib/firebase";
import { createApplicationPackageService } from "@/services/tailoring/package";
import type { ResumeProfile } from "@/types/resume";

export async function POST(request: Request) {
  try {
    const authResult = await verifyAuthToken(request);

    if (!authResult) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { jobId, tailoredResume } = body;

    if (!jobId || !tailoredResume) {
      return NextResponse.json({ 
        success: false, 
        error: "Missing required fields" 
      }, { status: 400 });
    }

    // Store tailored resume
    const tailoredRef = doc(getDb(), `users/${authResult.uid}/tailored-resumes/${jobId}`);
    await setDoc(tailoredRef, {
      jobId,
      content: tailoredResume,
      generatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ 
      success: true, 
      message: "Tailored resume saved successfully" 
    });

  } catch (error) {
    console.error("Tailored resume save error:", error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to save tailored resume" 
    }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const authResult = await verifyAuthToken(request);

    if (!authResult) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Get all application packages and extract tailored resumes
    const packageService = createApplicationPackageService();
    const packages = await packageService.listApplicationPackages(authResult.uid);
    
    const resumes = packages.map((pkg: any) => ({
      jobId: pkg.id,
      pdfUrl: undefined, // PDF generation not implemented yet
      profile: pkg.tailoredResume.content,
      generatedAt: pkg.tailoredResume.generatedAt,
    }));

    return NextResponse.json({ 
      success: true, 
      resumes 
    });

  } catch (error) {
    console.error("Tailored resumes retrieval error:", error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to retrieve tailored resumes" 
    }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const authResult = await verifyAuthToken(request);

    if (!authResult) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");

    if (!jobId) {
      return NextResponse.json({ 
        success: false, 
        error: "Job ID is required" 
      }, { status: 400 });
    }

    // Delete tailored resume
    const tailoredRef = doc(getDb(), `users/${authResult.uid}/tailored-resumes/${jobId}`);
    await deleteDoc(tailoredRef);

    return NextResponse.json({ 
      success: true, 
      message: "Tailored resume deleted successfully" 
    });

  } catch (error) {
    console.error("Tailored resume deletion error:", error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to delete tailored resume" 
    }, { status: 500 });
  }
}