import { NextResponse } from "next/server";

import { loadPrimaryResumeProfile, loadStoredJobs, matchJob, saveMatchResults } from "@/services/matcher/matcher";

export async function POST() {
  try {
    const resume = await loadPrimaryResumeProfile();

    if (!resume) {
      return NextResponse.json(
        {
          success: false,
          error: "No ResumeProfile found. Upload a resume before running the matcher.",
        },
        { status: 400 },
      );
    }

    const jobs = await loadStoredJobs();

    if (jobs.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No jobs found. Collect jobs before running the matcher.",
        },
        { status: 400 },
      );
    }

    const results = await Promise.all(jobs.map((job) => matchJob(resume, job)));
    await saveMatchResults(results);

    const recommended = results.filter((result) => result.recommended).length;
    const averageScore =
      results.length > 0
        ? Math.round(results.reduce((sum, result) => sum + result.overallScore, 0) / results.length)
        : 0;

    return NextResponse.json({
      success: true,
      jobsProcessed: results.length,
      recommended,
      averageScore,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Job matching failed.",
      },
      { status: 500 },
    );
  }
}
