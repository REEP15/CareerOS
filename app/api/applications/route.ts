import { NextResponse } from "next/server";
import { z } from "zod";

import { verifyAuthToken } from "@/lib/firebase";
import { getStoredApplications, updateApplicationStatus, updateApplicationNotes } from "@/services/apply/tracker";
import { ApplicationStatus } from "@/types/application";

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

    const applications = await getStoredApplications(authResult.uid);
    return NextResponse.json({ success: true, applications });
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

export async function PATCH(request: Request) {
  try {
    const authResult = await verifyAuthToken(request);

    if (!authResult) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    if ("notes" in body) {
      const { jobId, notes } = notesSchema.parse(body);
      const application = await updateApplicationNotes(authResult.uid, jobId, notes);
      return NextResponse.json({ success: true, application });
    }

    const { jobId, status, note } = statusSchema.parse(body);
    const application = await updateApplicationStatus(authResult.uid, jobId, status, note);
    return NextResponse.json({ success: true, application });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: "Invalid request." }, { status: 400 });
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update application.",
      },
      { status: 500 },
    );
  }
}
