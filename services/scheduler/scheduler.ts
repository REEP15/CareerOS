import { collectors } from "@/services/collector/registry";
import { dedupeJobs } from "@/services/collector/normalize";
import { saveCollectedJobs } from "@/services/collector/save";
import { getActiveMissions } from "@/services/missions/missions";
import { matchJob, saveMatchResults, loadPrimaryResumeProfile, loadStoredJobs } from "@/services/matcher/matcher";
import { createNotification } from "@/services/notifications/notifications";
import { NotificationType } from "@/types/notification";
import { getDashboardMetrics, invalidateDashboardCache } from "@/services/dashboard/metrics";

export type SchedulerResult = {
  collectors?: {
    jobsFound: number;
    added: number;
    duplicates: number;
  };
  matcher?: {
    jobsProcessed: number;
    recommended: number;
    averageScore: number;
    highMatches: number;
  };
  dashboard?: ReturnType<typeof getDashboardMetrics> extends Promise<infer T> ? T : never;
};

export async function runCollectors() {
  const activeMissions = await getActiveMissions();
  const collectedGroups = await Promise.all(collectors.map((collector) => collector.collect()));
  let mergedJobs = collectedGroups.flat();

  if (activeMissions.length > 0) {
    mergedJobs = mergedJobs.filter((job) =>
      activeMissions.some((mission) => {
        if (mission.sources.length > 0 && !mission.sources.includes(job.source)) {
          return false;
        }

        const text = `${job.title} ${job.description}`.toLowerCase();

        if (mission.keywords.length > 0 && !mission.keywords.some((k) => text.includes(k.toLowerCase()))) {
          return false;
        }

        if (mission.excludedKeywords.some((k) => text.includes(k.toLowerCase()))) {
          return false;
        }

        return true;
      }),
    );
  }

  const { jobs: uniqueJobs } = dedupeJobs(mergedJobs);
  const result = await saveCollectedJobs(uniqueJobs);

  await createNotification({
    type: NotificationType.COLLECTION_FINISHED,
    title: "Job Collection Complete",
    message: `Collected ${mergedJobs.length} jobs. Added ${result.added} new jobs.`,
    link: "/jobs",
  });

  if (activeMissions.length > 0) {
    await createNotification({
      type: NotificationType.MISSION_FINISHED,
      title: "Mission Collection Complete",
      message: `Filtered collection using ${activeMissions.length} active mission(s).`,
      link: "/missions",
    });
  }

  return {
    jobsFound: mergedJobs.length,
    added: result.added,
    duplicates: result.skipped + (mergedJobs.length - uniqueJobs.length),
  };
}

export async function runMatcher() {
  const resume = await loadPrimaryResumeProfile();

  if (!resume) {
    throw new Error("No ResumeProfile found. Upload a resume before matching.");
  }

  const jobs = await loadStoredJobs();
  const results = await Promise.all(jobs.map((job) => matchJob(resume, job)));
  await saveMatchResults(results);

  const recommended = results.filter((result) => result.recommended).length;
  const averageScore =
    results.length > 0 ? Math.round(results.reduce((sum, result) => sum + result.overallScore, 0) / results.length) : 0;
  const highMatches = results.filter((result) => result.overallScore >= 80);

  for (const match of highMatches) {
    const job = jobs.find((j) => j.id === match.jobId);

    if (job) {
      await createNotification({
        type: NotificationType.NEW_HIGH_MATCH,
        title: `High Match: ${job.title}`,
        message: `${match.overallScore}% match at ${job.company}`,
        link: `/jobs/${job.id}`,
      });
    }
  }

  return {
    jobsProcessed: results.length,
    recommended,
    averageScore,
    highMatches: highMatches.length,
  };
}

export async function refreshDashboard() {
  invalidateDashboardCache();
  return getDashboardMetrics();
}

export async function runFullPipeline(): Promise<SchedulerResult> {
  const collectors = await runCollectors();
  const matcher = await runMatcher();
  const dashboard = await refreshDashboard();

  return { collectors, matcher, dashboard };
}
