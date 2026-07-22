import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { MissionsForm } from "@/components/missions-form";
import { getMission } from "@/services/missions/missions";

export default async function EditMissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mission = await getMission(id);

  if (!mission) {
    notFound();
  }

  const { createdAt, updatedAt, ...missionInput } = mission;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit ${mission.name}`}
        description="Update mission criteria."
      />
      <MissionsForm
        initialData={{ ...missionInput, id }}
        isEdit
        redirectPath={`/missions/${id}`}
      />
    </div>
  );
}
