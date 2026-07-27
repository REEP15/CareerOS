"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";

import { JobDetailPanel } from "@/components/job-detail-panel";
import { PageHeader } from "@/components/page-header";
import { loadApplicationPackage } from "@/services/apply/tracker";
import { getCoverLetterVersions } from "@/services/coverLetter/generator";
import { getTailoredResumeVersions } from "@/services/tailoring/tailor";
import { useAuth } from "@/components/auth-provider";
import type { ApplicationPackage } from "@/services/apply/tracker";
import type { TailoredResume } from "@/types/tailoredResume";
import type { CoverLetter } from "@/types/coverLetter";

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, loading } = useAuth();
  const [applicationPackage, setApplicationPackage] = useState<ApplicationPackage | null>(null);
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
        loadApplicationPackage(user.uid, id),
        getTailoredResumeVersions(user.uid, id),
        getCoverLetterVersions(user.uid, id),
      ]).then(([pkg, resumes, coverLetters]) => {
        setApplicationPackage(pkg);
        setResumeVersions(resumes);
        setCoverLetterVersions(coverLetters);
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

  if (!applicationPackage) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={applicationPackage.job.title}
        description={`${applicationPackage.job.company} · Job detail and application package`}
      />
      <JobDetailPanel
        package={applicationPackage}
        resumeVersions={resumeVersions}
        coverLetterVersions={coverLetterVersions}
      />
    </div>
  );
}
