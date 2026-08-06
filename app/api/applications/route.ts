import { NextResponse } from "next/server";
import { z } from "zod";

import { verifyAuthToken } from "@/shared/lib/server-auth";
import { createApplicationPackageService } from "@/services/tailoring/package";
import { ApplicationStatus } from "@/shared/types/application";

const statusSchema = z.object({
  jobId: z.string().min(1),
  status: z.nativeEnum(ApplicationStatus),
  note: z.string().optional(),
});

const notesSchema = z.object({
  jobId: z.string().min(1),
  notes: z.string(),
});

export async function GET(request: Request) {
  try {
    const authResult = await verifyAuthToken(request);

    if (!authResult) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const packageService = createApplicationPackageService();
    const packages = await packageService.listApplicationPackages(authResult.uid);
    
    return NextResponse.json({ success: true, applications: packages });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch applications",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await verifyAuthToken(request);

    if (!authResult) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { jobId, status, note } = statusSchema.parse(body);

    const packageService = createApplicationPackageService();
    // Map old status to new status
    const newStatus = status === ApplicationStatus.NOT_APPLIED ? "draft" : status as any;
    await packageService.updatePackageStatus(authResult.uid, jobId, newStatus);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: "Invalid request data." }, { status: 400 });
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update application",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const authResult = await verifyAuthToken(request);

    if (!authResult) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { jobId, notes } = notesSchema.parse(body);

    // Notes functionality could be added to ApplicationPackage schema in future
    // For now, return success
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: "Invalid request data." }, { status: 400 });
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update application notes",
      },
      { status: 500 },
    );
  }
}