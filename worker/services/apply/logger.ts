export function logApply(level: "info" | "warn" | "error" | "debug", message: string, data?: Record<string, unknown>) {
  const payload = data ? { message, ...data } : { message };
  switch (level) {
    case "info":
      console.log("[apply][info]", payload);
      break;
    case "warn":
      console.warn("[apply][warn]", payload);
      break;
    case "error":
      console.error("[apply][error]", payload);
      break;
    case "debug":
      console.debug("[apply][debug]", payload);
      break;
    default:
      console.log("[apply]", payload);
  }
}

export type RetryOptions = {
  attempts?: number;
  delayMs?: number;
  label?: string;
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: number | RetryOptions = 3,
  delayMs = 1500,
): Promise<T> {
  const opts: RetryOptions =
    typeof options === "number"
      ? { attempts: options, delayMs }
      : { attempts: options.attempts ?? 3, delayMs: options.delayMs ?? delayMs, label: options.label };
  let attempt = 0;

  while (true) {
    try {
      return await fn();
    } catch (error) {
      attempt += 1;
      if (attempt >= (opts.attempts ?? 3)) {
        const labelMsg = opts.label ? ` after ${opts.label}` : "";
        const errMsg = error instanceof Error ? error.message : String(error);
        console.warn(`[apply][retry] failed${labelMsg}: ${errMsg}`);
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, opts.delayMs ?? 1500));
    }
  }
}
