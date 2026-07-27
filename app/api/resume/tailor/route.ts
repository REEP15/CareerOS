import { NextResponse } from "next/server";
import { z } from "zod";

import { verifyAuthToken } from "@/lib/firebase";
import { upsertApplication } from "@/services/apply/tracker";
import { generateTailoredResume } from "@/services/tailoring/tailor";
import { loadApplicationPackage } from "@/services/apply/tracker";
import { ApplicationStatus } from "@/types/application";

const requestSchema = z.object({
  jobId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const authResult = await verifyAuthToken(request);

    if (!authResult) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { jobId } = requestSchema.parse(await request.json());
    const applicationPackage = await loadApplicationPackage(authResult.uid, jobId);
    const tailoredResume = await generateTailoredResume(authResult.uid, applicationPackage.job, applicationPackage.match);

    await upsertApplication(authResult.uid, {
      jobId,
      resumeVersion: tailoredResume.versionLabel,
      status: applicationPackage.coverLetter ? ApplicationStatus.READY : ApplicationStatus.PREPARING,
      timelineNote: `Generated ${tailoredResume.versionLabel}`,
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
