import { launchApplicationBrowser } from "@/services/apply/playwright";
import { logApply } from "@/services/apply/logger";
import { loadApplicationPackage, type ApplicationResult, upsertApplication } from "@/services/apply/tracker";
import { ApplicationStatus } from "../../../../shared/types/application";
import { createNotification } from "@/services/notifications/notifications";
import { NotificationType } from "../../../../shared/types/notification";
import type { BrowserPage } from "../../../../shared/types/browser";

export async function startApplication(uid: string, jobId: string): Promise<ApplicationResult> {
  logApply("info", "Starting application", { jobId });

  const applicationPackage = await loadApplicationPackage(uid, jobId);

  await upsertApplication(uid, {
    jobId,
    status: ApplicationStatus.APPLYING,
    resumeVersion: applicationPackage.application.resumeVersion ?? applicationPackage.tailoredResume?.versionLabel,
    coverLetterVersion: applicationPackage.application.coverLetterVersion ?? applicationPackage.coverLetter?.versionLabel,
    timelineNote: "Playwright session started",
  });

  try {
    const result = await launchApplicationBrowser(uid, applicationPackage);

    await upsertApplication(uid, {
      jobId,
      status: ApplicationStatus.REVIEW_REQUIRED,
      timelineNote: result.reviewPageReached
        ? "Stopped on review page for manual submission"
        : "Form filled — manual review required",
    });

    await createNotification(uid, {
      type: NotificationType.APPLICATION_COMPLETE,
      title: "Application Ready for Review",
      message: `Application for ${applicationPackage.job.title} at ${applicationPackage.job.company} is ready for manual review.`,
      link: `/jobs/${jobId}`,
    });

    return {
      jobId,
      status: ApplicationStatus.REVIEW_REQUIRED,
      paused: result.paused,
      message: result.message,
      unknownFields: result.unknownFields,
    };
  } catch (error) {
    await upsertApplication(uid, {
      jobId,
      status: ApplicationStatus.READY,
      timelineNote: `Apply session failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    });

    throw error;
  }
}
