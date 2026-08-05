import { format, parseISO, startOfDay, subDays } from "date-fns";

import { getStoredApplications } from "@/services/apply/tracker";
import { getStoredJobs } from "@/services/collector/save";
import { getStoredMatches } from "@/services/matcher/matcher";
import { getMissions } from "@/services/missions/missions";
import { ApplicationStatus } from "@/types/application";

export type DashboardMetrics = {
  jobsCollected: number;
  recommended: number;
  applied: number;
  interviews: number;
  offers: number;
  rejections: number;
  averageMatchPercent: number;
  averageAiConfidence: number;
  applicationsByStatus: Array<{ status: string; count: number }>;
  matchDistribution: Array<{ range: string; count: number }>;
  jobsBySource: Array<{ source: string; count: number }>;
  dailyApplications: Array<{ date: string; count: number }>;
  weeklyCollectionTrend: Array<{ date: string; count: number }>;
  recentActivity: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    timestamp: string;
    link?: string;
  }>;
  pipeline: Array<{ status: ApplicationStatus; count: number; label: string }>;
  recommendedJobs: Array<{
    id: string;
    title: string;
    company: string;
    matchScore: number;
    location: string;
  }>;
};

let cachedMetrics: Map<string, { metrics: DashboardMetrics; timestamp: number }> = new Map();
const CACHE_TTL_MS = 30_000;

const STATUS_LABELS: Record<string, string> = {
  not_applied: "Not Applied",
  preparing: "Preparing",
  ready: "Ready",
  applying: "Applying",
  review_required: "Review Required",
  applied: "Applied",
  interview: "Interview",
  rejected: "Rejected",
  offer: "Offer",
  draft: "Draft",
  reviewed: "Reviewed",
  submitted: "Submitted",
};

export function invalidateDashboardCache(uid?: string) {
  if (uid) {
    cachedMetrics.delete(uid);
  } else {
    cachedMetrics.clear();
  }
}

export async function getDashboardMetrics(uid: string): Promise<DashboardMetrics> {
  const now = Date.now();
  const cached = cachedMetrics.get(uid);

  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.metrics;
  }

  const [jobs, matches, applications, missions] = await Promise.all([
    getStoredJobs(uid),
    getStoredMatches(uid),
    getStoredApplications(uid),
    getMissions(uid),
  ]);

  const recommended = matches.filter((match) => match.recommended).length;
  const applied = applications.filter((app) => app.status === ApplicationStatus.APPLIED).length;
  const interviews = applications.filter((app) => app.status === ApplicationStatus.INTERVIEW).length;
  const offers = applications.filter((app) => app.status === ApplicationStatus.OFFER).length;
  const rejections = applications.filter((app) => app.status === ApplicationStatus.REJECTED).length;

  const averageMatchPercent =
    matches.length > 0 ? Math.round(matches.reduce((sum, match) => sum + match.overallScore, 0) / matches.length) : 0;
  const averageAiConfidence =
    matches.length > 0 ? Math.round(matches.reduce((sum, match) => sum + match.confidence, 0) / matches.length) : 0;

  const statusCounts = new Map<string, number>();

  for (const status of Object.values(ApplicationStatus)) {
    statusCounts.set(status, 0);
  }

  for (const application of applications) {
    statusCounts.set(application.status, (statusCounts.get(application.status) ?? 0) + 1);
  }

  const notAppliedCount = jobs.length - applications.length;
  statusCounts.set(ApplicationStatus.NOT_APPLIED, (statusCounts.get(ApplicationStatus.NOT_APPLIED) ?? 0) + notAppliedCount);

  const applicationsByStatus = [...statusCounts.entries()].map(([status, count]) => ({
    status: STATUS_LABELS[status as ApplicationStatus] ?? status,
    count,
  }));

  const matchRanges = [
    { range: "0-39", min: 0, max: 39 },
    { range: "40-59", min: 40, max: 59 },
    { range: "60-79", min: 60, max: 79 },
    { range: "80-100", min: 80, max: 100 },
  ];

  const matchDistribution = matchRanges.map(({ range, min, max }) => ({
    range,
    count: matches.filter((match) => match.overallScore >= min && match.overallScore <= max).length,
  }));

  const sourceCounts = new Map<string, number>();

  for (const job of jobs) {
    sourceCounts.set(job.source, (sourceCounts.get(job.source) ?? 0) + 1);
  }

  const jobsBySource = [...sourceCounts.entries()].map(([source, count]) => ({ source, count }));

  const dailyApplications = buildDailyCounts(
    applications
      .filter((app) => app.appliedAt)
      .map((app) => app.appliedAt as string),
    14,
  );

  const weeklyCollectionTrend = buildDailyCounts(
    jobs.map((job) => job.scrapedAt),
    7,
  );

  const recommendedJobs = matches
    .filter((match) => match.recommended)
    .sort((left, right) => right.overallScore - left.overallScore)
    .slice(0, 5)
    .map((match) => {
      const job = jobs.find((j) => j.id === match.jobId);
      return {
        id: match.jobId,
        title: job?.title ?? "Unknown",
        company: job?.company ?? "Unknown",
        matchScore: match.overallScore,
        location: job?.location ?? "",
      };
    });

  const recentActivity = buildRecentActivity(jobs, matches, applications, missions);

  const pipeline = Object.values(ApplicationStatus).map((status) => ({
    status,
    count: statusCounts.get(status) ?? 0,
    label: STATUS_LABELS[status],
  }));

  const metrics = {
    jobsCollected: jobs.length,
    recommended,
    applied,
    interviews,
    offers,
    rejections,
    averageMatchPercent,
    averageAiConfidence,
    applicationsByStatus,
    matchDistribution,
    jobsBySource,
    dailyApplications,
    weeklyCollectionTrend,
    recentActivity,
    pipeline,
    recommendedJobs,
  };

  cachedMetrics.set(uid, { metrics, timestamp: now });

  return metrics;
}

function buildDailyCounts(dates: string[], days: number) {
  const result: Array<{ date: string; count: number }> = [];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const day = startOfDay(subDays(new Date(), offset));
    const dayKey = format(day, "yyyy-MM-dd");
    const count = dates.filter((dateStr) => {
      try {
        return format(startOfDay(parseISO(dateStr)), "yyyy-MM-dd") === dayKey;
      } catch {
        return false;
      }
    }).length;

    result.push({ date: format(day, "MMM d"), count });
  }

  return result;
}

function buildRecentActivity(
  jobs: Awaited<ReturnType<typeof getStoredJobs>>,
  matches: Awaited<ReturnType<typeof getStoredMatches>>,
  applications: Awaited<ReturnType<typeof getStoredApplications>>,
  missions: Awaited<ReturnType<typeof getMissions>>,
) {
  const activities: DashboardMetrics["recentActivity"] = [];

  for (const job of jobs.slice(0, 5)) {
    activities.push({
      id: `job-${job.id}`,
      type: "job",
      title: `New job: ${job.title}`,
      description: `${job.company} · ${job.source}`,
      timestamp: job.scrapedAt,
      link: `/jobs/${job.id}`,
    });
  }

  for (const match of matches.filter((m) => m.recommended).slice(0, 3)) {
    const job = jobs.find((j) => j.id === match.jobId);
    activities.push({
      id: `match-${match.jobId}`,
      type: "match",
      title: `Recommended: ${job?.title ?? match.jobId}`,
      description: `${match.overallScore}% match`,
      timestamp: match.createdAt,
      link: `/jobs/${match.jobId}`,
    });
  }

  for (const app of applications.slice(0, 5)) {
    const job = jobs.find((j) => j.id === app.jobId);
    activities.push({
      id: `app-${app.jobId}`,
      type: "application",
      title: `Application: ${job?.title ?? app.jobId}`,
      description: STATUS_LABELS[app.status],
      timestamp: app.updatedAt ?? app.appliedAt ?? new Date().toISOString(),
      link: `/jobs/${app.jobId}`,
    });
  }

  for (const mission of missions.slice(0, 3)) {
    activities.push({
      id: `mission-${mission.id}`,
      type: "mission",
      title: `Mission: ${mission.name}`,
      description: mission.active ? "Active" : "Inactive",
      timestamp: mission.updatedAt,
      link: `/missions/${mission.id}`,
    });
  }

  return activities
    .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
    .slice(0, 10);
}
