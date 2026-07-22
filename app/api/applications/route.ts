import { NextResponse } from "next/server";
import { z } from "zod";

import { updateApplicationStatus, updateApplicationNotes } from "@/services/apply/tracker";
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

export async function PATCH(request: Request) {
  try {
    const body = await request.json();

    if ("notes" in body) {
      const { jobId, notes } = notesSchema.parse(body);
      const application = await updateApplicationNotes(jobId, notes);
      return NextResponse.json({ success: true, application });
    }

    const { jobId, status, note } = statusSchema.parse(body);
    const application = await updateApplicationStatus(jobId, status, note);
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
