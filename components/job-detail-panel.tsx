"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowLeft, Download, FileText, Mail, Rocket } from "lucide-react";
import toast from "react-hot-toast";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { authFetch } from "@/lib/auth-fetch";
import type { ApplicationPackage } from "@/services/apply/tracker";
import {
  APPLICATION_STATUS_LABELS,
  ApplicationStatus,
  type Application,
} from "@/types/application";
import type { CoverLetter } from "@/types/coverLetter";
import type { TailoredResume } from "@/types/tailoredResume";

type JobDetailPanelProps = {
  package: ApplicationPackage;
  resumeVersions: TailoredResume[];
  coverLetterVersions: CoverLetter[];
};

type ActionResponse = { success: boolean; error?: string; application?: Application };

const STATUS_VARIANT: Partial<Record<ApplicationStatus, "default" | "secondary" | "success" | "destructive" | "outline">> = {
  [ApplicationStatus.READY]: "success",
  [ApplicationStatus.APPLIED]: "success",
  [ApplicationStatus.INTERVIEW]: "default",
  [ApplicationStatus.OFFER]: "success",
  [ApplicationStatus.REJECTED]: "destructive",
  [ApplicationStatus.REVIEW_REQUIRED]: "outline",
};

export function JobDetailPanel({ package: pkg, resumeVersions, coverLetterVersions }: JobDetailPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notes, setNotes] = useState(pkg.application.notes ?? "");
  const [status, setStatus] = useState(pkg.application.status);

  const { job, match, tailoredResume, coverLetter, application } = pkg;

  const handleAction = (endpoint: string, body: Record<string, unknown>, successMessage: string) => {
    startTransition(async () => {
      try {
        const response = await authFetch(endpoint, {
          method: endpoint.includes("/applications") ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const payload = (await response.json()) as ActionResponse;

        if (!response.ok || !payload.success) {
          toast.error(payload.error ?? "Action failed.");
          return;
        }

        toast.success(successMessage);
        router.refresh();
      } catch {
        toast.error("An unexpected error occurred.");
      }
    });
  };

  const handleStatusChange = (newStatus: ApplicationStatus) => {
    setStatus(newStatus);
    handleAction("/api/applications", { jobId: job.id, status: newStatus }, "Status updated.");
  };

  const handleSaveNotes = () => {
    handleAction("/api/applications", { jobId: job.id, notes }, "Notes saved.");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/jobs">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4" />
            Back to Jobs
          </Button>
        </Link>
        <Badge variant={STATUS_VARIANT[status] ?? "secondary"}>
          {APPLICATION_STATUS_LABELS[status]}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{job.title}</CardTitle>
              <CardDescription>
                {job.company} · {job.location} · {job.source}
                {job.salary ? ` · ${job.salary}` : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{job.description}</p>
              {job.applyUrl ? (
                <a
                  href={job.applyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-block text-sm text-primary hover:underline"
                >
                  View original posting
                </a>
              ) : null}
            </CardContent>
          </Card>

          {match ? (
            <Card>
              <CardHeader>
                <CardTitle>Match Analysis</CardTitle>
                <CardDescription>
                  {match.overallScore}% overall · {match.confidence}% confidence ·{" "}
                  {match.recommended ? "Recommended" : "Not recommended"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { label: "Skills", value: match.skillsScore },
                    { label: "Experience", value: match.experienceScore },
                    { label: "Education", value: match.educationScore },
                    { label: "Location", value: match.locationScore },
                    { label: "Salary", value: match.salaryScore },
                    { label: "Resume pass", value: match.resumePassProbability },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl border border-border/80 px-4 py-3">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="text-lg font-semibold">{item.value}%</p>
                    </div>
                  ))}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="mb-2 text-sm font-medium">Strengths</p>
                    <div className="flex flex-wrap gap-2">
                      {match.strengths.map((strength) => (
                        <Badge key={strength} variant="success">
                          {strength}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-sm font-medium">Weaknesses</p>
                    <div className="flex flex-wrap gap-2">
                      {match.weaknesses.map((weakness) => (
                        <Badge key={weakness} variant="destructive">
                          {weakness}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                {match.missingSkills.length > 0 ? (
                  <div>
                    <p className="mb-2 text-sm font-medium">Missing Skills</p>
                    <div className="flex flex-wrap gap-2">
                      {match.missingSkills.map((skill) => (
                        <Badge key={skill} variant="outline">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}
                <p className="text-sm text-muted-foreground">{match.reasoning}</p>
              </CardContent>
            </Card>
          ) : null}

          {tailoredResume ? (
            <Card>
              <CardHeader>
                <CardTitle>Resume Diff ({tailoredResume.versionLabel})</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm">
                  <p className="font-medium text-muted-foreground">Summary — Before</p>
                  <p className="mt-2">{tailoredResume.diff.summary.before}</p>
                  <p className="mt-4 font-medium text-muted-foreground">Summary — After</p>
                  <p className="mt-2">{tailoredResume.diff.summary.after}</p>
                </div>
                <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm">
                  <p className="font-medium text-muted-foreground">Skills — Before</p>
                  <p className="mt-2">{tailoredResume.diff.skills.before.join(", ") || "-"}</p>
                  <p className="mt-4 font-medium text-muted-foreground">Skills — After</p>
                  <p className="mt-2">{tailoredResume.diff.skills.after.join(", ") || "-"}</p>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {coverLetter ? (
            <Card>
              <CardHeader>
                <CardTitle>Cover Letter ({coverLetter.versionLabel})</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{coverLetter.content}</p>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Button
                variant="outline"
                disabled={isPending || !match}
                onClick={() =>
                  handleAction("/api/resume/tailor", { jobId: job.id }, "Tailored resume generated.")
                }
              >
                <FileText className="h-4 w-4" />
                Generate Resume
              </Button>
              <Button
                variant="outline"
                disabled={isPending || !match}
                onClick={() =>
                  handleAction("/api/cover-letter/generate", { jobId: job.id }, "Cover letter generated.")
                }
              >
                <Mail className="h-4 w-4" />
                Generate Cover Letter
              </Button>
              <Button
                disabled={isPending || !tailoredResume}
                onClick={() =>
                  handleAction("/api/apply/start", { jobId: job.id }, "Application opened for review.")
                }
              >
                <Rocket className="h-4 w-4" />
                Start Application
              </Button>
              {tailoredResume ? (
                <a
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-input bg-background px-4 text-sm font-medium hover:bg-muted"
                  href={tailoredResume.pdfUrl}
                  download
                >
                  <Download className="h-4 w-4" />
                  Download Resume
                </a>
              ) : null}
              {coverLetter ? (
                <a
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-input bg-background px-4 text-sm font-medium hover:bg-muted"
                  href={coverLetter.pdfUrl}
                  download
                >
                  <Download className="h-4 w-4" />
                  Download Cover Letter
                </a>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Application Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  id="status"
                  value={status}
                  onChange={(event) => handleStatusChange(event.target.value as ApplicationStatus)}
                  disabled={isPending}
                >
                  {Object.values(ApplicationStatus).map((value) => (
                    <option key={value} value={value}>
                      {APPLICATION_STATUS_LABELS[value]}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={4}
                  placeholder="Interview notes, follow-up dates..."
                />
                <Button variant="outline" size="sm" onClick={handleSaveNotes} disabled={isPending}>
                  Save Notes
                </Button>
              </div>
            </CardContent>
          </Card>

          {application.timeline && application.timeline.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[...application.timeline].reverse().map((event, index) => (
                  <div key={`${event.timestamp}-${index}`} className="border-l-2 border-border pl-4">
                    <p className="text-sm font-medium">{APPLICATION_STATUS_LABELS[event.status]}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(event.timestamp).toLocaleString()}
                    </p>
                    {event.note ? <p className="mt-1 text-xs">{event.note}</p> : null}
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {resumeVersions.length > 1 || coverLetterVersions.length > 1 ? (
            <Card>
              <CardHeader>
                <CardTitle>Artifact Versions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {resumeVersions.map((version) => (
                  <div key={version.id} className="flex items-center justify-between">
                    <span>Resume {version.versionLabel}</span>
                    <a href={version.pdfUrl} download className="text-primary hover:underline">
                      Download
                    </a>
                  </div>
                ))}
                {coverLetterVersions.map((version) => (
                  <div key={version.id} className="flex items-center justify-between">
                    <span>Cover letter {version.versionLabel}</span>
                    <a href={version.pdfUrl} download className="text-primary hover:underline">
                      Download
                    </a>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
