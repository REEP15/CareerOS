import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuth } from "@/lib/firebase";
import { upsertApplication } from "@/services/apply/tracker";
import { generateTailoredResume } from "@/services/tailoring/tailor";
import { loadApplicationPackage } from "@/services/apply/tracker";
import { ApplicationStatus } from "@/types/application";

const requestSchema = z.object({
  jobId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { jobId } = requestSchema.parse(await request.json());
    const applicationPackage = await loadApplicationPackage(user.uid, jobId);
    const tailoredResume = await generateTailoredResume(user.uid, applicationPackage.job, applicationPackage.match);

    await upsertApplication(user.uid, {
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
