import { PageHeader } from "@/components/page-header";
import { MissionsForm } from "@/components/missions-form";

export default function NewMissionPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="New Mission"
        description="Define targeted job search criteria to filter collected jobs and guide automation."
      />
      <MissionsForm redirectPath="/missions" />
    </div>
  );
}
