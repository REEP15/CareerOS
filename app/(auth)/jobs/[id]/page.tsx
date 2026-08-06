"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";

import { JobDetailPanel } from "@/components/job-detail-panel";
import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/components/auth-provider";
import { authFetch } from "@/shared/lib/auth-fetch";
import type { ApplicationPackage } from "@/shared/types/application";
import type { TailoredResume } from "@/shared/types/tailoredResume";
import type { CoverLetter } from "@/shared/types/coverLetter";
import type { JobPosting } from "@/shared/types/job";
import type { MatchResult } from "@/shared/types/match";

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, loading } = useAuth();
  const [job, setJob] = useState<JobPosting | null>(null);
  const [match, setMatch] = useState<MatchResult | null>(null);
  const [resumeVersions, setResumeVersions] = useState<TailoredResume[]>([]);
  const [coverLetterVersions, setCoverLetterVersions] = useState<CoverLetter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [id, setId] = useState<string>("");

  useEffect(() => {
    params.then(({ id: jobId }) => {
      setId(jobId);
    });
  }, [params]);

  useEffect(() => {
    if (!loading && user && id) {
      Promise.all([
        authFetch(`/api/jobs/${id}`).then((res) => res.json()),
        authFetch(`/api/tailored-resumes/${id}`).then((res) => res.json()),
        authFetch(`/api/cover-letters/${id}`).then((res) => res.json()),
        authFetch(`/api/matches/${id}`).then((res) => res.json()),
      ]).then(([jobRes, resumesRes, coverLettersRes, matchRes]) => {
        if (jobRes.success) {
          setJob(jobRes.job);
        }
        if (matchRes.success) {
          setMatch(matchRes.match);
        }
        if (resumesRes.success) {
          setResumeVersions(resumesRes.versions);
        }
        if (coverLettersRes.success) {
          setCoverLetterVersions(coverLettersRes.versions);
        }
      }).finally(() => setIsLoading(false));
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

  if (!job) {
    notFound();
  }

  // Create a minimal application package structure for the panel
  const applicationPackage: ApplicationPackage = {
    id: job.id,
    userId: user?.uid || "",
    job: {
      id: job.id,
      title: job.title,
      company: job.company,
      description: job.description,
      location: job.location,
      salary: job.salary,
      url: job.applyUrl,
      source: job.source,
      applyUrl: job.applyUrl,
    },
    tailoredResume: undefined,
    coverLetter: undefined,
    atsAnalysis: undefined,
    originalResumeId: "",
    status: "draft",
    generatedAt: job.scrapedAt,
    updatedAt: job.scrapedAt,
    application: {
      id: job.id,
      userId: user?.uid || "",
      jobId: job.id,
      status: "not_applied" as any,
      createdAt: job.scrapedAt,
      updatedAt: job.scrapedAt,
      notes: "",
    },
    match,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={job.title}
        description={`${job.company} · Job detail and application package`}
      />
      <JobDetailPanel
        package={applicationPackage}
        resumeVersions={resumeVersions}
        coverLetterVersions={coverLetterVersions}
      />
    </div>
  );
}
