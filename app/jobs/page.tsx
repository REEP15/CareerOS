import { JobsCollectorPanel } from "@/components/jobs-collector-panel";
import { PageHeader } from "@/components/page-header";
import { getStoredJobs } from "@/services/collector/save";
import { getStoredMatches } from "@/services/matcher/matcher";

export default async function JobsPage() {
  const [jobs, matches] = await Promise.all([getStoredJobs(), getStoredMatches()]);
  const matchesByJobId = new Map(matches.map((match) => [match.jobId, match]));
  const jobsWithMatches = jobs
    .map((job) => ({
      ...job,
      match: matchesByJobId.get(job.id) ?? null,
    }))
    .sort((left, right) => {
      const leftScore = left.match?.overallScore ?? -1;
      const rightScore = right.match?.overallScore ?? -1;

      return rightScore - leftScore;
    });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Jobs"
        description="CareerOS now collects normalized jobs, matches them against the ResumeProfile, and sorts the pipeline from strongest fit to weakest."
      />
      <JobsCollectorPanel jobs={jobsWithMatches} />
    </div>
  );
}
