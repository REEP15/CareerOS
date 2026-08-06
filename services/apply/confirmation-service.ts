export async function handleUserConfirmation(uid: string, jobId: string, runId: string, answer: any): Promise<any> {
  throw new Error("Confirmation handling is now handled by the worker service. Use the worker API instead.");
}
