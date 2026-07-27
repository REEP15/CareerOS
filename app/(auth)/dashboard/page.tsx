"use client";

import { useEffect, useState } from "react";

import { DashboardContent } from "@/components/dashboard-content";
import { PageHeader } from "@/components/page-header";
import { getDashboardMetrics } from "@/services/dashboard/metrics";
import { useAuth } from "@/components/auth-provider";
import type { DashboardMetrics } from "@/services/dashboard/metrics";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && user) {
      getDashboardMetrics(user.uid).then(setMetrics).finally(() => setIsLoading(false));
    } else if (!loading && !user) {
      setIsLoading(false);
    }
  }, [user, loading]);

  if (loading || isLoading || !metrics) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

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
