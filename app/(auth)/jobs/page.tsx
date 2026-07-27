"use client";

import { useEffect, useState } from "react";

import { JobsCollectorPanel } from "@/components/jobs-collector-panel";
import { PageHeader } from "@/components/page-header";
import { getStoredApplications } from "@/services/apply/tracker";
import { getStoredJobs } from "@/services/collector/save";
import { getCoverLetters } from "@/services/coverLetter/generator";
import { getStoredMatches } from "@/services/matcher/matcher";
import { getTailoredResumes } from "@/services/tailoring/tailor";
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
        getStoredJobs(user.uid),
        getStoredMatches(user.uid),
        getTailoredResumes(user.uid),
        getCoverLetters(user.uid),
        getStoredApplications(user.uid),
      ]).then(([jobs, matches, tailoredResumes, coverLetters, applications]) => {
        const matchesByJobId = new Map(matches.map((match) => [match.jobId, match]));
        const tailoredResumesByJobId = new Map(tailoredResumes.map((resume) => [resume.jobId, resume]));
        const coverLettersByJobId = new Map(coverLetters.map((coverLetter) => [coverLetter.jobId, coverLetter]));
        const applicationsByJobId = new Map(applications.map((application) => [application.jobId, application]));
        
        const jobsData = jobs
          .map((job) => ({
            ...job,
            application: applicationsByJobId.get(job.id) ?? null,
            coverLetter: coverLettersByJobId.get(job.id) ?? null,
            match: matchesByJobId.get(job.id) ?? null,
            tailoredResume: tailoredResumesByJobId.get(job.id) ?? null,
          }))
          .sort((left, right) => {
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
