/**
 * Engine context and hooks - integration between engine and CareerOS services
 * Mirrors v0_phase3/engine/context.ts
 */

import type { ConfirmationRequest, ConfirmationResponse, DetectedField, ResolvedAnswer } from "../../../../shared/types/automation";
import type { ExecutionPhase } from "../state-persistence";

export type LogLevel = "info" | "warn" | "error" | "debug";

export { ExecutionPhase };

export interface AutomationRunContext {
  runId: string;
  userId: string;
  job: {
    company: string;
    jobTitle: string;
    jobUrl: string;
    source: string;
  };
  resolver: any; // ResolverInputs from answer-resolver.ts
  confidenceThreshold: number;
  resumeState?: {
    phase: ExecutionPhase;
    currentStepIndex: number;
    filledFieldIds: string[];
    skippedFieldIds: string[];
    lastAction: string;
    fieldIndex: number;
    completedActions: string[];
    pendingConfirmation?: {
      fieldId: string;
      question: string;
      proposedAnswer?: any;
      timestamp: string;
    };
  };
}

export interface EngineHooks {
  log(level: LogLevel, message: string, data?: Record<string, unknown>): void;
  captureScreenshot(label: string): Promise<string>;
  requestConfirmation(req: ConfirmationRequest): Promise<ConfirmationResponse>;
  onFieldFilled?(field: DetectedField, answer: ResolvedAnswer): void;
  isAborted(): boolean;
  persistState?(phase: string, step: number, fieldIndex: number, completedActions: string[]): Promise<void>;
}