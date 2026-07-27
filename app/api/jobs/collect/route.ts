import { NextResponse } from "next/server";

import { verifyAuthToken } from "@/lib/firebase";
import { collectors } from "@/services/collector/registry";
import { dedupeJobs } from "@/services/collector/normalize";
import { saveCollectedJobs } from "@/services/collector/save";
import { getActiveMissions } from "@/services/missions/missions";
import { createNotification } from "@/services/notifications/notifications";
import { NotificationType } from "@/types/notification";

export async function POST(request: Request) {
  let authResult: { uid: string } | null = null;
  
  try {
    authResult = await verifyAuthToken(request);

    if (!authResult) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const activeMissions = await getActiveMissions(authResult.uid);
    const collectedGroups = await Promise.all(collectors.map((collector) => collector.collect()));
    let mergedJobs = collectedGroups.flat();

    if (activeMissions.length > 0) {
      mergedJobs = mergedJobs.filter((job) =>
        activeMissions.some((mission) => {
          if (mission.sources.length > 0 && !mission.sources.some((s) => s.toLowerCase() === job.source.toLowerCase())) {
            return false;
          }

          const text = `${job.title} ${job.description}`.toLowerCase();

          if (mission.keywords.length > 0 && !mission.keywords.some((k) => text.includes(k.toLowerCase()))) {
            return false;
          }

          if (mission.excludedKeywords.some((k) => text.includes(k.toLowerCase()))) {
            return false;
          }

          if (mission.locations.length > 0) {
            const jobLocation = job.location.toLowerCase();
            const locationMatch = mission.locations.some((loc) => jobLocation.includes(loc.toLowerCase()));

            if (!locationMatch && !(mission.remote && jobLocation.includes("remote"))) {
              return false;
            }
          }

          return true;
        }),
      );
    }

    const { jobs: uniqueJobs } = dedupeJobs(mergedJobs);
    const result = await saveCollectedJobs(authResult.uid, uniqueJobs);

    await createNotification(authResult.uid, {
      type: NotificationType.COLLECTION_FINISHED,
      title: "Job Collection Complete",
      message: `Added ${result.added} new jobs from ${collectors.length} collectors.`,
      link: "/jobs",
    });

    return NextResponse.json({
      success: true,
      collectors: collectors.length,
      jobsFound: mergedJobs.length,
      added: result.added,
      duplicates: result.skipped + (mergedJobs.length - uniqueJobs.length),
      missionFiltered: activeMissions.length > 0,
    });
  } catch (error) {
    if (authResult) {
      await createNotification(authResult.uid, {
        type: NotificationType.ERROR,
        title: "Collection Failed",
        message: error instanceof Error ? error.message : "Job collection failed.",
      }).catch(() => undefined);
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Job collection failed.",
      },
      { status: 500 },
    );
  }
}
