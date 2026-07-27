import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { MissionDetailPanel } from "@/components/mission-detail-panel";
import { getMission } from "@/services/missions/missions";

export default async function MissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mission = await getMission(id);

  if (!mission) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={mission.name}
        description="Mission details and related jobs."
      />
      <MissionDetailPanel mission={mission} />
    </div>
  );
}
