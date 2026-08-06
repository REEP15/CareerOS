/**
 * Engine hooks implementation - connects engine to CareerOS services
 * Bridges between orchestration engine and existing CareerOS infrastructure
 */

import type { ConfirmationRequest, ConfirmationResponse, DetectedField, ResolvedAnswer } from "@/types/automation";
import type { EngineHooks, LogLevel } from "./context";
import { upsertApplication } from "../tracker";
import { ApplicationStatus } from "@/types/application";
import { captureAndUploadScreenshot } from "../screenshot-service";
import { automationLoggingService } from "../logging-service";

export interface HooksDependencies {
  userId: string;
  jobId: string;
  runId: string;
  /** Function to upload screenshot and return storage reference */
  uploadScreenshot: (label: string) => Promise<string>;
  /** Function to request user confirmation via UI */
  requestUserConfirmation: (req: ConfirmationRequest) => Promise<ConfirmationResponse>;
  /** Function to check if automation should be aborted */
  isAborted: () => boolean;
  /** Function to persist execution state */
  persistState?: (phase: string, step: number, fieldIndex: number, completedActions: string[]) => Promise<void>;
  /** Optional console sink for logging */
  logSink?: (level: LogLevel, message: string, data?: Record<string, unknown>) => void;
  /** Optional page instance for actual screenshot capture */
  page?: any;
}

export function createEngineHooks(deps: HooksDependencies): EngineHooks {
  return {
    log: (level, message, data) => {
      deps.logSink?.(level, message, data);
      // Log to existing CareerOS logging system
      console.log(`[${level.toUpperCase()}] ${message}`, data);
      
      // Log to structured logging service (non-blocking)
      automationLoggingService.log({
        runId: deps.runId,
        userId: deps.userId,
        jobId: deps.jobId,
        level,
        message,
        data,
        category: "engine",
      }).catch((error) => {
        console.error("Failed to log to automation logging service:", error);
      });
    },

    captureScreenshot: async (label) => {
      let screenshotUrl: string;
      if (deps.page) {
        // Use actual screenshot capture if page is available
        screenshotUrl = await captureAndUploadScreenshot(deps.page, deps.userId, deps.jobId, label);
      } else {
        // Fall back to placeholder
        screenshotUrl = await deps.uploadScreenshot(label);
      }
      
      // Log screenshot capture with URL for linking
      automationLoggingService.log({
        runId: deps.runId,
        userId: deps.userId,
        jobId: deps.jobId,
        level: "info",
        message: `Screenshot captured: ${label}`,
        data: { label },
        category: "screenshot",
        screenshotUrl,
      }).catch((error) => {
        console.error("Failed to log screenshot to automation logging service:", error);
      });
      
      return screenshotUrl;
    },

    requestConfirmation: async (req) => {
      // Update application status to indicate awaiting user input
      await upsertApplication(deps.userId, {
        jobId: deps.jobId,
        status: ApplicationStatus.REVIEW_REQUIRED,
        timelineNote: `Awaiting user confirmation: ${req.reason}`,
      });

      const response = await deps.requestUserConfirmation(req);

      // Update application status after user response
      await upsertApplication(deps.userId, {
        jobId: deps.jobId,
        status: response.abort ? ApplicationStatus.READY : ApplicationStatus.APPLYING,
        timelineNote: response.abort ? "User cancelled automation" : "User provided input",
      });

      return response;
    },

    onFieldFilled: (field: DetectedField, answer: ResolvedAnswer) => {
      // Log field fill event to application timeline
      upsertApplication(deps.userId, {
        jobId: deps.jobId,
        status: ApplicationStatus.APPLYING,
        timelineNote: `Filled ${field.semantic} (${answer.source})`,
      }).catch(() => {}); // Don't block on logging
    },

    isAborted: () => deps.isAborted(),

    persistState: async (phase, step, fieldIndex, completedActions) => {
      if (deps.persistState) {
        await deps.persistState(phase, step, fieldIndex, completedActions);
      }
    },
  };
}