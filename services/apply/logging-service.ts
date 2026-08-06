export async function getAutomationLogs(uid: string, jobId: string): Promise<any[]> {
  return [];
}

export async function getLogsByRun(uid: string, jobId: string, runId: string): Promise<any[]> {
  return [];
}

export const automationLoggingService = {
  getLogs: getAutomationLogs,
  getLogsByRun
};
