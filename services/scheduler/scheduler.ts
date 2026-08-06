import { collectors } from "@/services/collector/registry";
import { dedupeJobs } from "@/services/collector/normalize";
import { saveCollectedJobs } from "@/services/collector/save";
import { getActiveMissions } from "@/services/missions/missions";
import { matchJob, saveMatchResults, loadPrimaryResumeProfile, loadStoredJobs } from "@/services/matcher/matcher";
import { createNotification } from "@/services/notifications/notifications";
import { NotificationType } from "@/shared/types/notification";
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
 
export async function runCollectors(uid: string) {
  // Job collection is now handled by the worker service
  // This function is kept for compatibility but does nothing
  return {
    jobsFound: 0,
    added: 0,
    duplicates: 0,
  };
}
 
export async function runMatcher(uid: string) {
  const resume = await loadPrimaryResumeProfile(uid);
 
  if (!resume) {
    throw new Error("No ResumeProfile found. Upload a resume before matching.");
  }
 
  const jobs = await loadStoredJobs(uid);
  const results = await Promise.all(jobs.map((job) => matchJob(resume, job)));
  await saveMatchResults(uid, results);
 
  const recommended = results.filter((result) => result.recommended).length;
  const averageScore =
    results.length > 0 ? Math.round(results.reduce((sum, result) => sum + result.overallScore, 0) / results.length) : 0;
  const highMatches = results.filter((result) => result.overallScore >= 80);
 
  for (const match of highMatches) {
    const job = jobs.find((j) => j.id === match.jobId);
 
    if (job) {
      await createNotification(uid, {
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
 
export async function refreshDashboard(uid: string) {
  invalidateDashboardCache(uid);
  return getDashboardMetrics(uid);
}
 
export async function runFullPipeline(uid: string): Promise<SchedulerResult> {
  const collectors = await runCollectors(uid);
  const matcher = await runMatcher(uid);
  const dashboard = await refreshDashboard(uid);
 
  return { collectors, matcher, dashboard };
}