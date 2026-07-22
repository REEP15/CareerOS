export type ApplyLogLevel = "info" | "warn" | "error";

export type ApplyLogEntry = {
  level: ApplyLogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, string | number | boolean>;
};

const logs: ApplyLogEntry[] = [];

export function logApply(level: ApplyLogLevel, message: string, context?: Record<string, string | number | boolean>) {
  const entry: ApplyLogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    context,
  };
  logs.push(entry);

  const prefix = `[apply:${level}]`;
  const contextStr = context ? ` ${JSON.stringify(context)}` : "";

  if (level === "error") {
    console.error(prefix, message, contextStr);
  } else if (level === "warn") {
    console.warn(prefix, message, contextStr);
  } else {
    console.info(prefix, message, contextStr);
  }

  return entry;
}

export function getApplyLogs() {
  return [...logs];
}

export function clearApplyLogs() {
  logs.length = 0;
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: { attempts: number; delayMs: number; label: string },
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= options.attempts; attempt += 1) {
    try {
      logApply("info", `Attempting ${options.label}`, { attempt, maxAttempts: options.attempts });
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      logApply("warn", `${options.label} failed`, { attempt, error: lastError.message });

      if (attempt < options.attempts) {
        await sleep(options.delayMs);
      }
    }
  }

  throw lastError ?? new Error(`${options.label} failed after ${options.attempts} attempts.`);
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}
