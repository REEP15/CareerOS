import { NextResponse } from "next/server";
import { z } from "zod";

import { upsertApplication } from "@/services/apply/tracker";
import { generateTailoredResume } from "@/services/tailoring/tailor";
import { loadApplicationPackage } from "@/services/apply/tracker";

const requestSchema = z.object({
  jobId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const { jobId } = requestSchema.parse(await request.json());
    const applicationPackage = await loadApplicationPackage(jobId);
    const tailoredResume = await generateTailoredResume(applicationPackage.job, applicationPackage.match);

    await upsertApplication({
      jobId,
      resumeVersion: tailoredResume.pdfUrl,
      status: applicationPackage.coverLetter ? "Ready" : "Preparing",
    });

    return NextResponse.json({
      success: true,
      tailoredResume,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: "Invalid jobId." }, { status: 400 });
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Resume tailoring failed.",
      },
      { status: 500 },
    );
  }
}
