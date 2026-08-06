"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, useEffect } from "react";
import { ArrowLeft, Download, FileText, Mail, Rocket, Play, Pause, X, Loader2, FileText as FileTextIcon, Image } from "lucide-react";
import toast from "react-hot-toast";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { authFetch } from "@/shared/lib/auth-fetch";
import type { ApplicationPackage } from "@/shared/types/application";
import {
  APPLICATION_STATUS_LABELS,
  ApplicationStatus,
  type Application,
} from "@/types/application";
import type { CoverLetter } from "@/types/coverLetter";
import type { TailoredResume } from "@/types/tailoredResume";
import { LogsViewer } from "@/components/automation/logs-viewer";
import { ScreenshotViewer } from "@/components/automation/screenshot-viewer";
import { ConfirmationDialog } from "@/components/automation/confirmation-dialog";

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
  const [notes, setNotes] = useState(pkg.application?.notes ?? "");
  const [status, setStatus] = useState(pkg.application?.status as ApplicationStatus);
  
  // Automation state
  const [automationStatus, setAutomationStatus] = useState<"idle" | "running" | "paused" | "completed" | "error">("idle");
  const [automationRunId, setAutomationRunId] = useState<string | null>(null);
  const [automationProgress, setAutomationProgress] = useState(0);
  
  // UI state
  const [showLogs, setShowLogs] = useState(false);
  const [showScreenshots, setShowScreenshots] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState<any>(null);

  const { job, match, tailoredResume, coverLetter, application } = pkg;

  if (!job) {
    return <div>Job information not available</div>;
  }

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

  const handleGenerateResume = () => {
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
            jobUrl: job.applyUrl || job.url,
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

  const handleGenerateCoverLetter = () => {
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

  const handleStatusChange = (newStatus: ApplicationStatus) => {
    setStatus(newStatus);
    handleAction("/api/applications", { jobId: job.id, status: newStatus }, "Status updated.");
  };

  const handleSaveNotes = () => {
    handleAction("/api/applications", { jobId: job.id, notes }, "Notes saved.");
  };

  // Automation control functions
  const handleStartAutomation = () => {
    startTransition(async () => {
      try {
        setAutomationStatus("running");
        setAutomationProgress(0);
        
        const response = await authFetch("/api/automation/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId: job.id }),
        });
        const payload = await response.json();

        if (!response.ok || !payload.success) {
          setAutomationStatus("error");
          toast.error(payload.error ?? "Automation failed to start.");
          return;
        }

        setAutomationRunId(payload.result?.runId || null);
        toast.success("Automation started successfully.");
        
        // Poll for status updates
        pollAutomationStatus(payload.result?.runId);
      } catch {
        setAutomationStatus("error");
        toast.error("An unexpected error occurred starting automation.");
      }
    });
  };

  const handlePauseAutomation = () => {
    startTransition(async () => {
      try {
        await authFetch("/api/automation/pause", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId: job.id, reason: "User requested pause" }),
        });
        
        setAutomationStatus("paused");
        toast.success("Automation paused.");
      } catch {
        toast.error("Failed to pause automation.");
      }
    });
  };

  const handleResumeAutomation = () => {
    if (!automationRunId) {
      toast.error("No automation run to resume.");
      return;
    }

    startTransition(async () => {
      try {
        setAutomationStatus("running");
        
        const response = await authFetch("/api/automation/resume", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId: job.id, runId: automationRunId }),
        });
        const payload = await response.json();

        if (!response.ok || !payload.success) {
          setAutomationStatus("error");
          toast.error(payload.error ?? "Failed to resume automation.");
          return;
        }

        toast.success("Automation resumed.");
        pollAutomationStatus(automationRunId);
      } catch {
        setAutomationStatus("error");
        toast.error("An unexpected error occurred resuming automation.");
      }
    });
  };

  const handleCancelAutomation = () => {
    startTransition(async () => {
      try {
        await authFetch("/api/automation/cancel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId: job.id }),
        });
        
        setAutomationStatus("idle");
        setAutomationRunId(null);
        setAutomationProgress(0);
        toast.success("Automation cancelled.");
      } catch {
        toast.error("Failed to cancel automation.");
      }
    });
  };

  const pollAutomationStatus = (runId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await authFetch(`/api/automation/status?jobId=${job.id}&runId=${runId}`);
        const payload = await response.json();

        if (!response.ok || !payload.success) {
          clearInterval(interval);
          setAutomationStatus("error");
          return;
        }

        const status = payload.status;
        if (status.state === "completed" || status.state === "submitted" || status.state === "failed" || status.state === "aborted") {
          clearInterval(interval);
          setAutomationStatus(status.state === "failed" || status.state === "aborted" ? "error" : "completed");
          setAutomationProgress(100);
          router.refresh();
        } else if (status.state === "awaiting_user") {
          clearInterval(interval);
          setAutomationStatus("paused");
          // Show confirmation dialog if pending
          if (status.pendingConfirmation) {
            setPendingConfirmation(status.pendingConfirmation);
            setShowConfirmation(true);
          }
        } else {
          // Update progress based on filled fields
          const totalFields = status.metadata?.totalFields || 1;
          const filledFields = status.metadata?.filledFields || 0;
          setAutomationProgress(Math.round((filledFields / totalFields) * 100));
        }
      } catch {
        clearInterval(interval);
        setAutomationStatus("error");
      }
    }, 2000); // Poll every 2 seconds
  };

  const handleConfirmationResponse = async (answer: any) => {
    if (!automationRunId) return;

    try {
      await authFetch("/api/automation/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id, runId: automationRunId, answer }),
      });
      
      setAutomationStatus("running");
      pollAutomationStatus(automationRunId);
    } catch {
      toast.error("Failed to submit confirmation.");
    }
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
                      {match?.strengths?.map((strength: string) => (
                        <Badge key={strength} variant="success">
                          {strength}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-sm font-medium">Weaknesses</p>
                    <div className="flex flex-wrap gap-2">
                      {match?.weaknesses?.map((weakness: string) => (
                        <Badge key={weakness} variant="destructive">
                          {weakness}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                {match?.missingSkills && match.missingSkills.length > 0 ? (
                  <div>
                    <p className="mb-2 text-sm font-medium">Missing Skills</p>
                    <div className="flex flex-wrap gap-2">
                      {match.missingSkills.map((skill: string) => (
                        <Badge key={skill} variant="outline">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}
                {match?.reasoning ? (
                  <p className="text-sm text-muted-foreground">{match.reasoning}</p>
                ) : null}
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
                onClick={handleGenerateResume}
              >
                <FileText className="h-4 w-4" />
                Generate Resume
              </Button>
              <Button
                variant="outline"
                disabled={isPending || !match}
                onClick={handleGenerateCoverLetter}
              >
                <Mail className="h-4 w-4" />
                Generate Cover Letter
              </Button>
              
              {/* Automation Controls */}
              {automationStatus === "idle" ? (
                <Button
                  disabled={isPending || !tailoredResume}
                  onClick={handleStartAutomation}
                >
                  <Rocket className="h-4 w-4" />
                  Auto-Apply
                </Button>
              ) : automationStatus === "running" ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Running... {automationProgress}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div 
                      className="h-full rounded-full bg-primary transition-all" 
                      style={{ width: `${automationProgress}%` }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePauseAutomation}
                      disabled={isPending}
                    >
                      <Pause className="h-4 w-4" />
                      Pause
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowLogs(true)}
                      disabled={isPending}
                    >
                      <FileTextIcon className="h-4 w-4" />
                      Logs
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowScreenshots(true)}
                      disabled={isPending}
                    >
                      <Image className="h-4 w-4" />
                      Screenshots
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelAutomation}
                      disabled={isPending}
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : automationStatus === "paused" ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Automation paused</p>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleResumeAutomation}
                      disabled={isPending}
                    >
                      <Play className="h-4 w-4" />
                      Resume
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowLogs(true)}
                      disabled={isPending}
                    >
                      <FileTextIcon className="h-4 w-4" />
                      Logs
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowScreenshots(true)}
                      disabled={isPending}
                    >
                      <Image className="h-4 w-4" />
                      Screenshots
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelAutomation}
                      disabled={isPending}
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : automationStatus === "completed" ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <Rocket className="h-4 w-4" />
                    Application completed successfully
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowLogs(true)}
                      disabled={isPending}
                    >
                      <FileTextIcon className="h-4 w-4" />
                      View Logs
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowScreenshots(true)}
                      disabled={isPending}
                    >
                      <Image className="h-4 w-4" />
                      View Screenshots
                    </Button>
                  </div>
                </div>
              ) : automationStatus === "error" ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-red-600">
                    <X className="h-4 w-4" />
                    Automation failed or was cancelled
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowLogs(true)}
                      disabled={isPending}
                    >
                      <FileTextIcon className="h-4 w-4" />
                      View Logs
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowScreenshots(true)}
                      disabled={isPending}
                    >
                      <Image className="h-4 w-4" />
                      View Screenshots
                    </Button>
                  </div>
                </div>
              ) : null}
              
              <Button
                variant="outline"
                disabled={isPending || !tailoredResume}
                onClick={() =>
                  handleAction("/api/automation/run", { jobId: job.id }, "Application opened for review.")
                }
              >
                <Rocket className="h-4 w-4" />
                Start Application (Manual)
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

          {application?.timeline && application.timeline.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[...application.timeline].reverse().map((event, index) => (
                  <div key={`${event.timestamp}-${index}`} className="border-l-2 border-border pl-4">
                    <p className="text-sm font-medium">{event.status ? APPLICATION_STATUS_LABELS[event.status as keyof typeof APPLICATION_STATUS_LABELS] : "Unknown"}</p>
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

      {/* Automation UI Components */}
      <LogsViewer
        jobId={job.id}
        runId={automationRunId || undefined}
        isOpen={showLogs}
        onClose={() => setShowLogs(false)}
      />
      
      <ScreenshotViewer
        jobId={job.id}
        runId={automationRunId || undefined}
        isOpen={showScreenshots}
        onClose={() => setShowScreenshots(false)}
      />
      
      <ConfirmationDialog
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={(answer) => {
          // Handle confirmation response
          handleConfirmationResponse(answer);
        }}
        onSkip={() => {
          // Handle skip
          handleConfirmationResponse({ answered: false });
        }}
        onAbort={() => {
          // Handle abort
          handleCancelAutomation();
        }}
        question={pendingConfirmation?.question || ""}
        reason={pendingConfirmation?.reason || ""}
        proposedAnswer={pendingConfirmation?.proposedAnswer}
        field={pendingConfirmation?.field}
      />
    </div>
  );
}
