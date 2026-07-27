import { MissionsPanel } from "@/components/missions-panel";
import { PageHeader } from "@/components/page-header";

export default function MissionsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Missions"
        description="Define targeted job search criteria to filter collected jobs and guide automation."
      />
      <MissionsPanel />
    </div>
  );
}
