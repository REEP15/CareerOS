import { NextResponse } from "next/server";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { verifyAuthToken } from "@/lib/server-auth";
import { removeUndefined } from "@/lib/utils";
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
    const { jobId, jobTitle, jobCompany, jobDescription, jobLocation, jobSalary, jobUrl } = body;

    if (!jobId || !jobTitle || !jobCompany || !jobDescription) {
      return NextResponse.json({ 
        success: false, 
        error: "Missing required job fields" 
      }, { status: 400 });
    }

    // Get user's resume
    const resumeRef = doc(getDb(), `users/${authResult.uid}/resume/primary`);
    const resumeSnapshot = await getDoc(resumeRef);

    if (!resumeSnapshot.exists()) {
      return NextResponse.json({ 
        success: false, 
        error: "No resume found. Please upload a resume first." 
      }, { status: 404 });
    }

    const resume = resumeSnapshot.data() as ResumeProfile;

    // Create application package
    const packageService = createApplicationPackageService();
    const applicationPackage = await packageService.createApplicationPackage(
      resume,
      {
        id: jobId,
        title: jobTitle,
        company: jobCompany,
        description: jobDescription,
        location: jobLocation,
        salary: jobSalary,
        url: jobUrl,
      }
    );

    return NextResponse.json({ 
      success: true, 
      applicationPackage 
    });

  } catch (error) {
    console.error("Application package creation error:", error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to create application package" 
    }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const authResult = await verifyAuthToken(request);

    if (!authResult) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const packageId = searchParams.get("packageId");

    if (packageId) {
      // Get specific package
      const packageService = createApplicationPackageService();
      const pkg = await packageService.getApplicationPackage(authResult.uid, packageId);

      if (!pkg) {
        return NextResponse.json({ 
          success: false, 
          error: "Application package not found" 
        }, { status: 404 });
      }

      return NextResponse.json({ success: true, applicationPackage: pkg });
    } else {
      // List all packages
      const packageService = createApplicationPackageService();
      const packages = await packageService.listApplicationPackages(authResult.uid);

      return NextResponse.json({ success: true, packages });
    }

  } catch (error) {
    console.error("Application package retrieval error:", error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to retrieve application packages" 
    }, { status: 500 });
  }
}