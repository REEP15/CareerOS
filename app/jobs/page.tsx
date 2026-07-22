import { JobsCollectorPanel } from "@/components/jobs-collector-panel";
import { PageHeader } from "@/components/page-header";
import { getStoredJobs } from "@/services/collector/save";

export default async function JobsPage() {
  const jobs = await getStoredJobs();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Jobs"
        description="CareerOS now uses a modular collector pipeline that aggregates normalized jobs from multiple providers into a single schema."
      />
      <JobsCollectorPanel jobs={jobs} />
    </div>
  );
}
