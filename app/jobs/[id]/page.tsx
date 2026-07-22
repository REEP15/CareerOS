import { notFound } from "next/navigation";

import { JobDetailPanel } from "@/components/job-detail-panel";
import { PageHeader } from "@/components/page-header";
import { loadApplicationPackage } from "@/services/apply/tracker";
import { getCoverLetterVersions } from "@/services/coverLetter/generator";
import { getTailoredResumeVersions } from "@/services/tailoring/tailor";

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [applicationPackage, resumeVersions, coverLetterVersions] = await Promise.all([
    loadApplicationPackage(id),
    getTailoredResumeVersions(id),
    getCoverLetterVersions(id),
  ]);

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
