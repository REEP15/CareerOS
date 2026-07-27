import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuth } from "@/lib/firebase";
import { generateCoverLetter } from "@/services/coverLetter/generator";
import { loadApplicationPackage, upsertApplication } from "@/services/apply/tracker";
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
    const coverLetter = await generateCoverLetter(user.uid, applicationPackage.job, applicationPackage.match);

    await upsertApplication(user.uid, {
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
