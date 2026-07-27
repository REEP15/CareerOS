"use client";

import { useEffect, useState } from "react";

import { DashboardContent } from "@/components/dashboard-content";
import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/components/auth-provider";
import { authFetch } from "@/lib/auth-fetch";
import type { DashboardMetrics } from "@/services/dashboard/metrics";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      authFetch("/api/dashboard")
        .then((res) => res.json())
        .then((payload) => {
          if (payload.success) {
            setMetrics(payload.metrics);
          } else {
            setError(payload.error || "Failed to load dashboard");
          }
        })
        .catch((err) => {
          setError(err.message || "Failed to load dashboard");
        })
        .finally(() => setIsLoading(false));
    } else if (!loading && !user) {
      setIsLoading(false);
    }
  }, [user, loading]);

  if (loading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-destructive">Error: {error}</p>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">No dashboard data available</p>
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
