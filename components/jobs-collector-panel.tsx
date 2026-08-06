"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, Eye, ExternalLink, FileText, Mail, Rocket } from "lucide-react";
import toast from "react-hot-toast";

import { EmptyJobs } from "@/components/empty-states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { authFetch } from "@/lib/auth-fetch";
import { APPLICATION_STATUS_LABELS, ApplicationStatus, type Application } from "@/types/application";
import type { CoverLetter } from "@/types/coverLetter";
import type { JobPosting } from "@/types/job";
import type { MatchResult } from "@/types/match";

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
  tailoredResume: {
    jobId: string;
    pdfUrl?: string;
    profile: any;
    generatedAt: string;
  } | null;
};

type SortField = "score" | "company" | "title" | "location" | "newest" | "salary";

export function JobsCollectorPanel({ jobs }: { jobs: JobWithApplicationPackage[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [recommendedFilter, setRecommendedFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [remoteFilter, setRemoteFilter] = useState("all");
  const [minMatchFilter, setMinMatchFilter] = useState("");
  const [minSalaryFilter, setMinSalaryFilter] = useState("");
  const [sortField, setSortField] = useState<SortField>("score");

  const sources = useMemo(() => [...new Set(jobs.map((job) => job.source))], [jobs]);
  const locations = useMemo(() => [...new Set(jobs.map((job) => job.location))], [jobs]);

  const filteredJobs = useMemo(() => {
    let result = [...jobs];

    if (search) {
      const query = search.toLowerCase();
      result = result.filter(
        (job) =>
          job.title.toLowerCase().includes(query) ||
          job.company.toLowerCase().includes(query) ||
          job.location.toLowerCase().includes(query),
      );
    }

    if (statusFilter !== "all") {
      result = result.filter(
        (job) => (job.application?.status ?? ApplicationStatus.NOT_APPLIED) === statusFilter,
      );
    }

    if (recommendedFilter === "recommended") {
      result = result.filter((job) => job.match?.recommended);
    } else if (recommendedFilter === "not-recommended") {
      result = result.filter((job) => job.match && !job.match.recommended);
    }

    if (sourceFilter !== "all") {
      result = result.filter((job) => job.source === sourceFilter);
    }

    if (locationFilter !== "all") {
      result = result.filter((job) => job.location === locationFilter);
    }

    if (remoteFilter === "remote") {
      result = result.filter((job) => job.location.toLowerCase().includes("remote"));
    } else if (remoteFilter === "onsite") {
      result = result.filter((job) => !job.location.toLowerCase().includes("remote"));
    }

    if (minMatchFilter) {
      const minMatch = Number.parseInt(minMatchFilter, 10);
      result = result.filter((job) => (job.match?.overallScore ?? 0) >= minMatch);
    }

    if (minSalaryFilter) {
      const minSalary = Number.parseInt(minSalaryFilter, 10);
      result = result.filter((job) => {
        if (!job.salary) return false;
        const salaryMatch = /(\d[\d,]*)/.exec(job.salary.replace(/,/g, ""));
        if (!salaryMatch) return false;
        const salaryNumber = Number.parseInt(salaryMatch[1], 10);
        return salaryNumber >= minSalary;
      });
    }

    result.sort((left, right) => {
      switch (sortField) {
        case "company":
          return left.company.localeCompare(right.company);
        case "title":
          return left.title.localeCompare(right.title);
        case "location":
          return left.location.localeCompare(right.location);
        case "newest":
          return new Date(right.scrapedAt).getTime() - new Date(left.scrapedAt).getTime();
        case "salary":
          const leftSalary = left.salary ? extractSalaryNumber(left.salary) ?? 0 : 0;
          const rightSalary = right.salary ? extractSalaryNumber(right.salary) ?? 0 : 0;
          return rightSalary - leftSalary;
        default:
          return (right.match?.overallScore ?? -1) - (left.match?.overallScore ?? -1);
      }
    });

    return result;
  }, [jobs, search, statusFilter, recommendedFilter, sourceFilter, locationFilter, remoteFilter, minMatchFilter, minSalaryFilter, sortField]);

  function extractSalaryNumber(salary: string): number | null {
    const match = /(\d[\d,]*)/.exec(salary.replace(/,/g, ""));
    return match ? Number.parseInt(match[1], 10) : null;
  }

  const handleCollect = () => {
    startTransition(async () => {
      try {
        const response = await authFetch("/api/jobs/collect", { method: "POST" });
        const payload = (await response.json()) as CollectJobsResponse;

        if (!response.ok || !payload.success) {
          toast.error(payload.success ? "Job collection failed." : payload.error);
          return;
        }

        toast.success(
          `Collected ${payload.jobsFound} jobs. Added ${payload.added}, skipped ${payload.duplicates}.`,
        );
        router.refresh();
      } catch {
        toast.error("An unexpected error occurred while collecting jobs.");
      }
    });
  };

  const handleMatch = () => {
    startTransition(async () => {
      try {
        const response = await authFetch("/api/jobs/match", { method: "POST" });
        const payload = (await response.json()) as MatchJobsResponse;

        if (!response.ok || !payload.success) {
          toast.error(payload.success ? "Job matching failed." : payload.error);
          return;
        }

        toast.success(
          `Matched ${payload.jobsProcessed} jobs. ${payload.recommended} recommended (avg ${payload.averageScore}%).`,
        );
        router.refresh();
      } catch {
        toast.error("An unexpected error occurred while matching jobs.");
      }
    });
  };

  const handleJobAction = (endpoint: string, jobId: string, successMessage: string) => {
    startTransition(async () => {
      try {
        const response = await authFetch(endpoint, {
          method: endpoint.includes("/applications") ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId }),
        });
        const payload = (await response.json()) as JobActionResponse;

        if (!response.ok || !payload.success) {
          toast.error(payload.error ?? "Action failed.");
          return;
        }

        toast.success(successMessage);
        router.refresh();
      } catch {
        toast.error("An unexpected error occurred while running this action.");
      }
    });
  };

  const handleGenerateResume = (job: JobWithApplicationPackage) => {
    startTransition(async () => {
      try {
        const response = await authFetch("/api/resume/tailor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobId: job.id,
            jobTitle: job.title,
            jobCompany: job.company,
            jobDescription: job.description,
            jobLocation: job.location,
            jobSalary: job.salary,
            jobUrl: job.applyUrl,
          }),
        });
        const payload = await response.json();

        if (!response.ok || !payload.success) {
          toast.error(payload.error ?? "Failed to generate tailored resume.");
          return;
        }

        toast.success("Tailored resume generated.");
        router.refresh();
      } catch {
        toast.error("An unexpected error occurred.");
      }
    });
  };

  const handleGenerateCoverLetter = (job: JobWithApplicationPackage) => {
    startTransition(async () => {
      try {
        const response = await authFetch("/api/cover-letter/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobId: job.id,
            jobTitle: job.title,
            jobCompany: job.company,
            jobDescription: job.description,
          }),
        });
        const payload = await response.json();

        if (!response.ok || !payload.success) {
          toast.error(payload.error ?? "Failed to generate cover letter.");
          return;
        }

        toast.success("Cover letter generated.");
        router.refresh();
      } catch {
        toast.error("An unexpected error occurred.");
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
              {filteredJobs.length} of {jobs.length} jobs shown
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
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Input
              placeholder="Search title, company, location..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="sm:col-span-2 lg:col-span-3"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All statuses</option>
              {Object.entries(APPLICATION_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <Select value={recommendedFilter} onChange={(event) => setRecommendedFilter(event.target.value)}>
              <option value="all">All recommendations</option>
              <option value="recommended">Recommended</option>
              <option value="not-recommended">Not recommended</option>
            </Select>
            <Select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}>
              <option value="all">All sources</option>
              {sources.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </Select>
            {remoteFilter !== "remote" && (
              <Select value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)}>
                <option value="all">All locations</option>
                {locations.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </Select>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Select value={remoteFilter} onChange={(event) => setRemoteFilter(event.target.value)}>
              <option value="all">All work types</option>
              <option value="remote">Remote</option>
              <option value="onsite">On-site</option>
            </Select>
            <div className="space-y-1">
              <Label htmlFor="minMatch" className="text-xs">Min match %</Label>
              <Input
                id="minMatch"
                type="number"
                min={0}
                max={100}
                placeholder="0"
                value={minMatchFilter}
                onChange={(event) => setMinMatchFilter(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="minSalary" className="text-xs">Min salary</Label>
              <Input
                id="minSalary"
                type="number"
                min={0}
                placeholder="0"
                value={minSalaryFilter}
                onChange={(event) => setMinSalaryFilter(event.target.value)}
              />
            </div>
            <Select value={sortField} onChange={(event) => setSortField(event.target.value as SortField)}>
              <option value="score">Sort by match score</option>
              <option value="newest">Sort by newest</option>
              <option value="salary">Sort by salary</option>
              <option value="company">Sort by company</option>
              <option value="title">Sort by title</option>
              <option value="location">Sort by location</option>
            </Select>
          </div>

          {filteredJobs.length === 0 ? (
            jobs.length === 0 ? (
              <EmptyJobs />
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">No jobs match your filters.</p>
            )
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border/80">
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
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredJobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-medium">
                        <Link href={`/jobs/${job.id}`} className="hover:underline">
                          {job.company}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/jobs/${job.id}`} className="hover:underline">
                          {job.title}
                        </Link>
                      </TableCell>
                      <TableCell>{job.match ? `${job.match.overallScore}%` : "-"}</TableCell>
                      <TableCell>
                        {job.match ? (
                          <Badge variant={job.match.recommended ? "success" : "secondary"}>
                            {job.match.recommended ? "Yes" : "No"}
                          </Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="max-w-52">
                        {job.match && job.match.missingSkills && job.match.missingSkills.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {job.match.missingSkills.slice(0, 3).map((skill) => (
                              <Badge key={skill} variant="outline">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>{job.location}</TableCell>
                      <TableCell>{job.source}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {APPLICATION_STATUS_LABELS[job.application?.status ?? ApplicationStatus.NOT_APPLIED]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex min-w-64 flex-wrap gap-2">
                          <Link href={`/jobs/${job.id}`}>
                            <Button size="sm" variant="ghost">
                              <ExternalLink className="h-4 w-4" />
                              Details
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleGenerateResume(job)}
                            disabled={isPending || !job.match}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleGenerateCoverLetter(job)}
                            disabled={isPending || !job.match}
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(job.applyUrl, '_blank')}
                            disabled={!job.applyUrl}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {job.tailoredResume ? (
                            <a
                              className="inline-flex h-9 items-center justify-center rounded-lg border border-input bg-background px-2 hover:bg-muted"
                              href={job.tailoredResume.pdfUrl}
                              download
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          ) : null}
                          <Button
                            size="sm"
                            onClick={() =>
                              handleJobAction(
                                "/api/automation/run",
                                job.id,
                                `Application opened for ${job.title}.`,
                              )
                            }
                            disabled={isPending || !job.tailoredResume}
                          >
                            <Rocket className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
