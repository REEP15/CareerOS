export async function loadPlaywright(): Promise<any> {
  throw new Error("Browser automation is now handled by the worker service. Use the worker API instead.");
}

export function wrapPlaywrightPage(page: any): any {
  throw new Error("Browser automation is now handled by the worker service. Use the worker API instead.");
}
