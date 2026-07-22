"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { JobPosting } from "@/types/job";

type CollectJobsResponse =
  | {
      success: true;
      collectors: number;
      jobsFound: number;
      added: number;
      duplicates: number;
    }
  | {
      success: false;
      error: string;
    };

export function JobsCollectorPanel({ jobs }: { jobs: JobPosting[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCollect = () => {
    startTransition(async () => {
      setError(null);
      setMessage(null);

      try {
        const response = await fetch("/api/jobs/collect", {
          method: "POST",
        });
        const payload = (await response.json()) as CollectJobsResponse;

        if (!response.ok || !payload.success) {
          setError(payload.success ? "Job collection failed." : payload.error);
          return;
        }

        setMessage(
          `Collected ${payload.jobsFound} jobs from ${payload.collectors} collectors. Added ${payload.added}, skipped ${payload.duplicates}.`,
        );
        router.refresh();
      } catch {
        setError("An unexpected error occurred while collecting jobs.");
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5">
            <CardTitle>Collected Jobs</CardTitle>
            <CardDescription>
              Run all enabled collectors, normalize the results, remove duplicates, and save new
              postings to Firestore.
            </CardDescription>
          </div>
          <Button onClick={handleCollect} disabled={isPending}>
            {isPending ? "Collecting..." : "Collect Jobs"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {message ? (
            <div className="rounded-xl border border-border bg-muted/60 px-4 py-3 text-sm text-foreground">
              {message}
            </div>
          ) : null}
          {error ? (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}
          <div className="overflow-hidden rounded-2xl border border-border/80">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Salary</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.length > 0 ? (
                  jobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-medium">{job.company}</TableCell>
                      <TableCell>{job.title}</TableCell>
                      <TableCell>{job.location}</TableCell>
                      <TableCell>{job.source}</TableCell>
                      <TableCell>{job.salary ?? "Not listed"}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                      No jobs stored yet. Run the collector to seed the pipeline.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
