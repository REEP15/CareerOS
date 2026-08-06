/**
 * Structured automation logging system
 * Captures and stores detailed logs during automation runs
 */

import { doc, setDoc, collection, addDoc, query, where, orderBy, getDocs } from "firebase/firestore";
import { getUserAutomationLogsCollection, isFirebaseConfigured } from "@/lib/firebase";
import type { LogLevel } from "./engine/context";

export interface AutomationLogEntry {
  id?: string;
  runId: string;
  userId: string;
  jobId: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: Record<string, unknown>;
  category?: "engine" | "adapter" | "generic" | "screenshot" | "confirmation" | "error";
  screenshotUrl?: string;
}

export class AutomationLoggingService {
  /**
   * Log an automation event
   */
  async log(entry: Omit<AutomationLogEntry, "id" | "timestamp">): Promise<void> {
    if (!isFirebaseConfigured()) {
      console.log(`[${entry.level.toUpperCase()}] ${entry.message}`, entry.data);
      return;
    }

    const collection = getUserAutomationLogsCollection(entry.userId);
    await addDoc(collection, {
      ...entry,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get logs for a specific run
   */
  async getRunLogs(userId: string, runId: string): Promise<AutomationLogEntry[]> {
    if (!isFirebaseConfigured()) {
      return [];
    }

    const collection = getUserAutomationLogsCollection(userId);
    const q = query(
      collection,
      where("runId", "==", runId),
      orderBy("timestamp", "asc")
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
      } as any;
    });
  }

  /**
   * Get logs for a specific job (across all runs)
   */
  async getJobLogs(userId: string, jobId: string): Promise<AutomationLogEntry[]> {
    if (!isFirebaseConfigured()) {
      return [];
    }

    const collection = getUserAutomationLogsCollection(userId);
    const q = query(
      collection,
      where("jobId", "==", jobId),
      orderBy("timestamp", "desc")
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
      } as any;
    });
  }

  /**
   * Get logs for a specific run and job
   */
  async getLogsByRun(userId: string, jobId: string, runId?: string): Promise<AutomationLogEntry[]> {
    if (!isFirebaseConfigured()) {
      return [];
    }

    const collection = getUserAutomationLogsCollection(userId);
    let q = query(
      collection,
      where("jobId", "==", jobId),
      orderBy("timestamp", "asc")
    );

    if (runId) {
      q = query(
        collection,
        where("jobId", "==", jobId),
        where("runId", "==", runId),
        orderBy("timestamp", "asc")
      );
    }

    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
      } as any;
    });
  }

  /**
   * Get logs by level
   */
  async getLogsByLevel(userId: string, runId: string, level: LogLevel): Promise<AutomationLogEntry[]> {
    if (!isFirebaseConfigured()) {
      return [];
    }

    const collection = getUserAutomationLogsCollection(userId);
    const q = query(
      collection,
      where("runId", "==", runId),
      where("level", "==", level),
      orderBy("timestamp", "asc")
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
      } as any;
    });
  }

  /**
   * Get error logs for a run
   */
  async getErrorLogs(userId: string, runId: string): Promise<AutomationLogEntry[]> {
    return this.getLogsByLevel(userId, runId, "error");
  }

  /**
   * Clear logs for a specific run
   */
  async clearRunLogs(userId: string, runId: string): Promise<void> {
    if (!isFirebaseConfigured()) {
      return;
    }

    const logs = await this.getRunLogs(userId, runId);
    const collection = getUserAutomationLogsCollection(userId);

    for (const log of logs) {
      if (log.id) {
        await setDoc(doc(collection, log.id), { deleted: true }, { merge: true });
      }
    }
  }
}

// Singleton instance
export const automationLoggingService = new AutomationLoggingService();
