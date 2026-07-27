import { DashboardContent } from "@/components/dashboard-content";
import { PageHeader } from "@/components/page-header";
import { getDashboardMetrics } from "@/services/dashboard/metrics";

export default async function DashboardPage() {
  const metrics = await getDashboardMetrics();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Track your job pipeline, match quality, and application progress at a glance."
      />
      <DashboardContent metrics={metrics} />
    </div>
  );
}
