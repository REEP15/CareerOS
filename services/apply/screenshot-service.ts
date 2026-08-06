export async function getAutomationScreenshots(uid: string, jobId: string): Promise<any[]> {
  return [];
}

export async function getScreenshotsByRun(uid: string, jobId: string, runId: string): Promise<any[]> {
  return [];
}

export const automationScreenshotService = {
  getScreenshots: getAutomationScreenshots,
  getScreenshotsByRun
};
