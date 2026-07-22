import { NextResponse } from "next/server";

import { collectors } from "@/services/collector/registry";
import { dedupeJobs } from "@/services/collector/normalize";
import { saveCollectedJobs } from "@/services/collector/save";

export async function POST() {
  try {
    const collectedGroups = await Promise.all(collectors.map((collector) => collector.collect()));
    const mergedJobs = collectedGroups.flat();
    const { jobs: uniqueJobs } = dedupeJobs(mergedJobs);
    const result = await saveCollectedJobs(uniqueJobs);

    return NextResponse.json({
      success: true,
      collectors: collectors.length,
      jobsFound: mergedJobs.length,
      added: result.added,
      duplicates: result.skipped + (mergedJobs.length - uniqueJobs.length),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Job collection failed.",
      },
      { status: 500 },
    );
  }
}
