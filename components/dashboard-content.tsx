"use client";

import Link from "next/link";
import { useTransition } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Briefcase, RefreshCw, Rocket, Target, Zap } from "lucide-react";
import toast from "react-hot-toast";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardMetrics } from "@/services/dashboard/metrics";

const PIPELINE_COLORS = [
  "#94a3b8",
  "#60a5fa",
  "#34d399",
  "#fbbf24",
  "#f97316",
  "#22c55e",
  "#a855f7",
  "#ef4444",
  "#10b981",
];

export function DashboardContent({ metrics }: { metrics: DashboardMetrics }) {
  const [isPending, startTransition] = useTransition();

  const statCards = [
    { label: "Jobs Collected", value: metrics.jobsCollected },
    { label: "Recommended", value: metrics.recommended },
    { label: "Applied", value: metrics.applied },
    { label: "Interviews", value: metrics.interviews },
    { label: "Offers", value: metrics.offers },
    { label: "Rejections", value: metrics.rejections },
  ];

  const handleQuickAction = async (action: string) => {
    startTransition(async () => {
      try {
        let endpoint = "";
        let successMessage = "";

        switch (action) {
          case "collect":
            endpoint = "/api/jobs/collect";
            successMessage = "Job collection started.";
            break;
          case "match":
            endpoint = "/api/jobs/match";
            successMessage = "Job matching started.";
            break;
          case "pipeline":
            endpoint = "/api/scheduler";
            successMessage = "Full pipeline started.";
            break;
          default:
            return;
        }

        const response = await fetch(endpoint, { method: "POST" });
        const payload = await response.json();

        if (!response.ok || !payload.success) {
          toast.error(payload.error ?? "Action failed.");
          return;
        }

        toast.success(successMessage);
      } catch {
        toast.error("An unexpected error occurred.");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardDescription>{stat.label}</CardDescription>
              <CardTitle className="text-3xl">{stat.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Run common automation tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => handleQuickAction("collect")}
              disabled={isPending}
            >
              <Briefcase className="h-4 w-4" />
              Collect Jobs
            </Button>
            <Button
              variant="outline"
              onClick={() => handleQuickAction("match")}
              disabled={isPending}
            >
              <Target className="h-4 w-4" />
              Run Matcher
            </Button>
            <Button
              variant="outline"
              onClick={() => handleQuickAction("pipeline")}
              disabled={isPending}
            >
              <Zap className="h-4 w-4" />
              Run Full Pipeline
            </Button>
            <Link href="/missions/new">
              <Button variant="outline">
                <Rocket className="h-4 w-4" />
                New Mission
              </Button>
            </Link>
            <Link href="/resume">
              <Button variant="outline">
                <RefreshCw className="h-4 w-4" />
                Update Resume
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Application Pipeline</CardTitle>
            <CardDescription>Jobs by application status</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={metrics.pipeline.filter((item) => item.count > 0)}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={70} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Match Distribution</CardTitle>
            <CardDescription>
              Avg match {metrics.averageMatchPercent}% · AI confidence {metrics.averageAiConfidence}%
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={metrics.matchDistribution}
                  dataKey="count"
                  nameKey="range"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={(props) => {
                    const entry = props.payload as { range: string; count: number } | undefined;
                    return entry && entry.count > 0 ? `${entry.range}: ${entry.count}` : "";
                  }}
                >
                  {metrics.matchDistribution.map((_, index) => (
                    <Cell key={index} fill={PIPELINE_COLORS[index % PIPELINE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Recommended Jobs</CardTitle>
            <CardDescription>Highest match scores</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {metrics.recommendedJobs.length > 0 ? (
              metrics.recommendedJobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="flex items-center justify-between rounded-xl border border-border/80 px-4 py-3 transition-colors hover:bg-muted/50"
                >
                  <div>
                    <p className="font-medium">{job.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {job.company} · {job.location}
                    </p>
                  </div>
                  <Badge variant="success">{job.matchScore}%</Badge>
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No recommended jobs yet. Run the matcher first.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest pipeline events</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {metrics.recentActivity.length > 0 ? (
              metrics.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start justify-between gap-4 rounded-xl border border-border/80 px-4 py-3">
                  <div>
                    <p className="font-medium">{activity.title}</p>
                    <p className="text-sm text-muted-foreground">{activity.description}</p>
                  </div>
                  {activity.link ? (
                    <Link href={activity.link} className="shrink-0 text-xs text-primary hover:underline">
                      View
                    </Link>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
