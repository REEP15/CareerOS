import { JobsCollectorPanel } from "@/components/jobs-collector-panel";
import { PageHeader } from "@/components/page-header";
import { getStoredApplications } from "@/services/apply/tracker";
import { getStoredJobs } from "@/services/collector/save";
import { getCoverLetters } from "@/services/coverLetter/generator";
import { getStoredMatches } from "@/services/matcher/matcher";
import { getTailoredResumes } from "@/services/tailoring/tailor";

export default async function JobsPage() {
  const [jobs, matches, tailoredResumes, coverLetters, applications] = await Promise.all([
    getStoredJobs(),
    getStoredMatches(),
    getTailoredResumes(),
    getCoverLetters(),
    getStoredApplications(),
  ]);
  const matchesByJobId = new Map(matches.map((match) => [match.jobId, match]));
  const tailoredResumesByJobId = new Map(tailoredResumes.map((resume) => [resume.jobId, resume]));
  const coverLettersByJobId = new Map(coverLetters.map((coverLetter) => [coverLetter.jobId, coverLetter]));
  const applicationsByJobId = new Map(applications.map((application) => [application.jobId, application]));
  const jobsWithMatches = jobs
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
