"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, Eye, FileText, Mail, Rocket } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Application } from "@/types/application";
import type { CoverLetter } from "@/types/coverLetter";
import type { JobPosting } from "@/types/job";
import type { MatchResult } from "@/types/match";
import type { TailoredResume } from "@/types/tailoredResume";

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

type MatchJobsResponse =
  | {
      success: true;
      jobsProcessed: number;
      recommended: number;
      averageScore: number;
    }
  | {
      success: false;
      error: string;
    };

type JobActionResponse = {
  success: boolean;
  error?: string;
};

type JobWithApplicationPackage = JobPosting & {
  application: Application | null;
  coverLetter: CoverLetter | null;
  match: MatchResult | null;
  tailoredResume: TailoredResume | null;
};

export function JobsCollectorPanel({ jobs }: { jobs: JobWithApplicationPackage[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedDiff, setSelectedDiff] = useState<TailoredResume | null>(null);

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

  const handleMatch = () => {
    startTransition(async () => {
      setError(null);
      setMessage(null);

      try {
        const response = await fetch("/api/jobs/match", {
          method: "POST",
        });
        const payload = (await response.json()) as MatchJobsResponse;

        if (!response.ok || !payload.success) {
          setError(payload.success ? "Job matching failed." : payload.error);
          return;
        }

        setMessage(
          `Matched ${payload.jobsProcessed} jobs. Recommended ${payload.recommended} with an average score of ${payload.averageScore}%.`,
        );
        router.refresh();
      } catch {
        setError("An unexpected error occurred while matching jobs.");
      }
    });
  };

  const handleJobAction = (endpoint: string, jobId: string, successMessage: string) => {
    startTransition(async () => {
      setError(null);
      setMessage(null);

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ jobId }),
        });
        const payload = (await response.json()) as JobActionResponse;

        if (!response.ok || !payload.success) {
          setError(payload.error ?? "Action failed.");
          return;
        }

        setMessage(successMessage);
        router.refresh();
      } catch {
        setError("An unexpected error occurred while running this action.");
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
              Run collectors, match jobs, generate application documents, and start assisted
              applications.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleCollect} disabled={isPending}>
              {isPending ? "Working..." : "Collect Jobs"}
            </Button>
            <Button variant="outline" onClick={handleMatch} disabled={isPending}>
              {isPending ? "Working..." : "Run Matcher"}
            </Button>
          </div>
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
                  <TableHead>Match %</TableHead>
                  <TableHead>Recommended</TableHead>
                  <TableHead>Missing Skills</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Salary</TableHead>
                  <TableHead>Resume Ready</TableHead>
                  <TableHead>Cover Letter Ready</TableHead>
                  <TableHead>Application Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.length > 0 ? (
                  jobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-medium">{job.company}</TableCell>
                      <TableCell>{job.title}</TableCell>
                      <TableCell>{job.match ? `${job.match.overallScore}%` : "-"}</TableCell>
                      <TableCell>
                        {job.match ? (
                          <span
                            className={
                              job.match.recommended
                                ? "rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700"
                                : "rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
                            }
                          >
                            {job.match.recommended ? "Recommended" : "Not Recommended"}
                          </span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="max-w-52">
                        {job.match && job.match.missingSkills.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {job.match.missingSkills.slice(0, 3).map((skill) => (
                              <span
                                key={skill}
                                className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>{job.location}</TableCell>
                      <TableCell>{job.source}</TableCell>
                      <TableCell>{job.salary ?? "Not listed"}</TableCell>
                      <TableCell>{job.tailoredResume ? "Yes" : "No"}</TableCell>
                      <TableCell>{job.coverLetter ? "Yes" : "No"}</TableCell>
                      <TableCell>{job.application?.status ?? "Not Applied"}</TableCell>
                      <TableCell>
                        <div className="flex min-w-72 flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleJobAction(
                                "/api/resume/tailor",
                                job.id,
                                `Tailored resume generated for ${job.title}.`,
                              )
                            }
                            disabled={isPending || !job.match}
                          >
                            <FileText className="h-4 w-4" />
                            Generate Resume
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleJobAction(
                                "/api/cover-letter/generate",
                                job.id,
                                `Cover letter generated for ${job.title}.`,
                              )
                            }
                            disabled={isPending || !job.match}
                          >
                            <Mail className="h-4 w-4" />
                            Generate Cover Letter
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedDiff(job.tailoredResume)}
                            disabled={!job.tailoredResume}
                          >
                            <Eye className="h-4 w-4" />
                            Preview Diff
                          </Button>
                          {job.tailoredResume ? (
                            <a
                              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-input bg-background px-3 text-sm font-medium hover:bg-muted"
                              href={job.tailoredResume.pdfUrl}
                              download
                            >
                              <Download className="h-4 w-4" />
                              Resume
                            </a>
                          ) : null}
                          {job.coverLetter ? (
                            <a
                              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-input bg-background px-3 text-sm font-medium hover:bg-muted"
                              href={job.coverLetter.pdfUrl}
                              download
                            >
                              <Download className="h-4 w-4" />
                              Cover Letter
                            </a>
                          ) : null}
                          <Button
                            size="sm"
                            onClick={() =>
                              handleJobAction(
                                "/api/apply/start",
                                job.id,
                                `Application opened for ${job.title}. Review and submit manually.`,
                              )
                            }
                            disabled={isPending || !job.tailoredResume}
                          >
                            <Rocket className="h-4 w-4" />
                            Start Application
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={12} className="py-10 text-center text-sm text-muted-foreground">
                      No jobs stored yet. Run the collector to seed the pipeline.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      {selectedDiff ? (
        <Card>
          <CardHeader>
            <CardTitle>Resume Diff Preview</CardTitle>
            <CardDescription>
              {selectedDiff.profile.personal.name} tailored for job ID {selectedDiff.jobId}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <p className="text-sm font-medium">Summary</p>
              <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm">
                <p className="font-medium text-muted-foreground">Before</p>
                <p className="mt-2">{selectedDiff.diff.summary.before}</p>
                <p className="mt-4 font-medium text-muted-foreground">After</p>
                <p className="mt-2">{selectedDiff.diff.summary.after}</p>
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-medium">Skills and Keywords</p>
              <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm">
                <p className="font-medium text-muted-foreground">Before</p>
                <p className="mt-2">{selectedDiff.diff.skills.before.join(", ") || "-"}</p>
                <p className="mt-4 font-medium text-muted-foreground">After</p>
                <p className="mt-2">{selectedDiff.diff.skills.after.join(", ") || "-"}</p>
                <p className="mt-4 font-medium text-muted-foreground">ATS Keywords</p>
                <p className="mt-2">{selectedDiff.diff.keywordOptimizations.join(", ") || "-"}</p>
                <p className="mt-4 font-medium text-muted-foreground">Prioritized Projects</p>
                <p className="mt-2">{selectedDiff.diff.prioritizedProjects.join(", ") || "-"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
