"use client";

import { useEffect, useState } from "react";

import { DashboardContent } from "@/components/dashboard-content";
import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/components/auth-provider";
import type { DashboardMetrics } from "@/services/dashboard/metrics";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && user) {
      fetch("/api/dashboard")
        .then((res) => res.json())
        .then((payload) => {
          if (payload.success) {
            setMetrics(payload.metrics);
          }
        })
        .finally(() => setIsLoading(false));
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
