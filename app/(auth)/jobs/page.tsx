"use client";

import { useEffect, useState } from "react";

import { JobsCollectorPanel } from "@/components/jobs-collector-panel";
import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/components/auth-provider";
import type { JobPosting } from "@/types/job";

type JobWithApplicationPackage = JobPosting & {
  application: import("@/types/application").Application | null;
  coverLetter: import("@/types/coverLetter").CoverLetter | null;
  match: import("@/types/match").MatchResult | null;
  tailoredResume: import("@/types/tailoredResume").TailoredResume | null;
};

export default function JobsPage() {
  const { user, loading } = useAuth();
  const [jobsWithMatches, setJobsWithMatches] = useState<JobWithApplicationPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && user) {
      Promise.all([
        fetch("/api/jobs").then((res) => res.json()),
        fetch("/api/matches").then((res) => res.json()),
        fetch("/api/tailored-resumes").then((res) => res.json()),
        fetch("/api/cover-letters").then((res) => res.json()),
        fetch("/api/applications").then((res) => res.json()),
      ]).then(([jobsRes, matchesRes, resumesRes, coverLettersRes, applicationsRes]) => {
        const jobs = jobsRes.success ? jobsRes.jobs : [];
        const matches = matchesRes.success ? matchesRes.matches : [];
        const tailoredResumes = resumesRes.success ? resumesRes.resumes : [];
        const coverLetters = coverLettersRes.success ? coverLettersRes.coverLetters : [];
        const applications = applicationsRes.success ? applicationsRes.applications : [];
        
        const matchesByJobId = new Map(matches.map((match: any) => [match.jobId, match]));
        const tailoredResumesByJobId = new Map(tailoredResumes.map((resume: any) => [resume.jobId, resume]));
        const coverLettersByJobId = new Map(coverLetters.map((coverLetter: any) => [coverLetter.jobId, coverLetter]));
        const applicationsByJobId = new Map(applications.map((application: any) => [application.jobId, application]));
        
        const jobsData = jobs
          .map((job: any) => ({
            ...job,
            application: applicationsByJobId.get(job.id) ?? null,
            coverLetter: coverLettersByJobId.get(job.id) ?? null,
            match: matchesByJobId.get(job.id) ?? null,
            tailoredResume: tailoredResumesByJobId.get(job.id) ?? null,
          }))
          .sort((left: any, right: any) => {
            const leftScore = left.match?.overallScore ?? -1;
            const rightScore = right.match?.overallScore ?? -1;
            return rightScore - leftScore;
          });
        
        setJobsWithMatches(jobsData);
      }).finally(() => setIsLoading(false));
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Jobs"
        description="CareerOS now collects normalized jobs, matches them against the ResumeProfile, and prepares application packages for matched roles."
      />
      <JobsCollectorPanel jobs={jobsWithMatches} />
    </div>
  );
}
