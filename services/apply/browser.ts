import { launchApplicationBrowser } from "@/services/apply/playwright";
import { loadApplicationPackage, type ApplicationResult, upsertApplication } from "@/services/apply/tracker";

export async function startApplication(jobId: string): Promise<ApplicationResult> {
  const applicationPackage = await loadApplicationPackage(jobId);

  await upsertApplication({
    jobId,
    status: "Applying",
  });

  const result = await launchApplicationBrowser(applicationPackage);

  return {
    jobId,
    status: "Applying",
    paused: result.paused,
    message: result.message,
  };
}
