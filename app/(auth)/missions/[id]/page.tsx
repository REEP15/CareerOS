"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { MissionDetailPanel } from "@/components/mission-detail-panel";
import { useAuth } from "@/components/auth-provider";
import type { Mission } from "@/types/mission";

export default function MissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, loading } = useAuth();
  const [mission, setMission] = useState<Mission | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [id, setId] = useState<string>("");

  useEffect(() => {
    params.then(({ id: missionId }) => {
      setId(missionId);
    });
  }, [params]);

  useEffect(() => {
    if (!loading && user && id) {
      fetch(`/api/missions/${id}`)
        .then((res) => res.json())
        .then((payload) => {
          if (payload.success) {
            setMission(payload.mission);
          }
        })
        .finally(() => setIsLoading(false));
    } else if (!loading && !user) {
      setIsLoading(false);
    }
  }, [user, loading, id]);

  if (loading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

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
