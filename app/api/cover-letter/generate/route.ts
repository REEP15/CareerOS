import { NextResponse } from "next/server";
import { z } from "zod";

import { generateCoverLetter } from "@/services/coverLetter/generator";
import { loadApplicationPackage, upsertApplication } from "@/services/apply/tracker";
import { ApplicationStatus } from "@/types/application";

const requestSchema = z.object({
  jobId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const { jobId } = requestSchema.parse(await request.json());
    const applicationPackage = await loadApplicationPackage(jobId);
    const coverLetter = await generateCoverLetter(applicationPackage.job, applicationPackage.match);

    await upsertApplication({
      coverLetterVersion: coverLetter.versionLabel,
      jobId,
      status: applicationPackage.tailoredResume ? ApplicationStatus.READY : ApplicationStatus.PREPARING,
      timelineNote: `Generated ${coverLetter.versionLabel}`,
    });

    return NextResponse.json({
      success: true,
      coverLetter,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: "Invalid jobId." }, { status: 400 });
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Cover letter generation failed.",
      },
      { status: 500 },
    );
  }
}
