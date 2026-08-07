/**
 * Automation service - integrates all automation components
 * Main entry point for Phase 3 automation
 */

import type { BrowserPage } from "@/types/browser";
import type { AutomationResult } from "@/types/automation";
import { CoreAutomationEngine } from "./engine/core-engine";
import { buildRegistry } from "./adapters";
import { createEngineHooks, type HooksDependencies } from "./engine/hooks";
import type { AutomationRunContext } from "./engine/context";
import { loadApplicationPackage } from "./tracker";
import { mapResumeProfileToUserProfile, type ResolverInputs, type UserProfile } from "./answer-resolver";
import { loadPrimaryResumeProfile } from "../matcher/matcher";
import { generateResumePDF, generateCoverLetterPDF } from "../files/pdf-generator";
import { wrapPlaywrightPage, loadPlaywright, type Page as PlaywrightPage } from "./browser-adapter";
import { statePersistenceService, type AutomationRunState } from "./state-persistence";
import { captureAndUploadScreenshot } from "./screenshot-service";
import { automationLoggingService } from "./logging-service";

export interface AutomationServiceOptions {
  userId: string;
  jobId: string;
  confidenceThreshold?: number;
}

export interface AutomationServiceDeps {
  userId: string;
  jobId: string;
  runId: string;
  /** Function to request user confirmation via UI */
  requestUserConfirmation: (req: any) => Promise<any>;
  /** Function to check if automation should be aborted */
  isAborted: () => boolean;
  /** Optional console sink for logging */
  logSink?: (level: string, message: string, data?: any) => void;
  /** Get user's primary resume profile */
  getResumeProfile: () => Promise<any>;
  /** Generate PDF from resume content */
  generateResumePDF: (resume: any) => Promise<string>;
  /** Generate PDF from cover letter content */
  generateCoverLetterPDF: (content: string) => Promise<string>;
}

export class AutomationService {
  private readonly deps: AutomationServiceDeps;
  private readonly options: AutomationServiceOptions;
  private currentRunId: string | null = null;

  constructor(deps: AutomationServiceDeps, options: AutomationServiceOptions) {
    this.deps = deps;
    this.options = options;
    this.currentRunId = deps.runId ?? null;
  }

  /**
   * Run complete automation flow
   */
  async run(): Promise<AutomationResult> {
    const { userId, jobId, confidenceThreshold } = this.options;

    // Load application package
    const applicationPackage = await loadApplicationPackage(userId, jobId);
    if (!applicationPackage) {
      throw new Error("Application package not found. Generate one first.");
    }

    if (!applicationPackage.tailoredResume) {
      throw new Error("Tailored resume not found in application package.");
    }

    // Load resume profile for answer resolution
    const resumeProfile = await this.deps.getResumeProfile();
    if (!resumeProfile) {
      throw new Error("Resume profile not found. Upload a resume first.");
    }

    // Map to UserProfile interface
    const userProfile = mapResumeProfileToUserProfile(resumeProfile, userId);

    // Generate PDF files for upload
    const resumePDF = await this.deps.generateResumePDF(applicationPackage.tailoredResume.content);
    const coverLetterPDF = applicationPackage.coverLetter
      ? await this.deps.generateCoverLetterPDF(applicationPackage.coverLetter.content)
      : undefined;

    // Create resolver inputs
    const resolverInputs: ResolverInputs = {
      profile: userProfile,
      resume: {
        id: applicationPackage.job.id, // Use job ID as unique identifier
        label: applicationPackage.tailoredResume.versionLabel,
        fileRef: resumePDF,
        fileName: "tailored-resume.pdf",
        contentType: "application/pdf",
      },
      coverLetter: coverLetterPDF && applicationPackage.coverLetter
        ? {
            id: "cover-letter",
            label: "Cover Letter",
            fileRef: coverLetterPDF,
            fileName: "cover-letter.pdf",
            contentType: "application/pdf",
            bodyText: applicationPackage.coverLetter.content,
          }
        : undefined,
      resumePath: resumePDF,
      coverLetterPath: coverLetterPDF,
    };

    // Create automation context
    const runId = `run_${Date.now()}`;
    this.currentRunId = runId;
    const ctx: AutomationRunContext = {
      runId,
      userId,
      job: {
        company: applicationPackage.job.company,
        jobTitle: applicationPackage.job.title,
        jobUrl: applicationPackage.job.applyUrl || "",
        source: applicationPackage.job.source || "unknown",
      },
      resolver: resolverInputs,
      confidenceThreshold: confidenceThreshold ?? 0.7,
    };

    // Initialize state persistence
    await statePersistenceService.initializeRun({
      runId,
      userId,
      jobId,
      context: {
        company: applicationPackage.job.company,
        jobTitle: applicationPackage.job.title,
        jobUrl: applicationPackage.job.applyUrl || "",
        source: applicationPackage.job.source || "unknown",
      },
    });

    // Log automation start
    await automationLoggingService.log({
      runId,
      userId,
      jobId,
      level: "info",
      message: "Automation started",
      data: { company: applicationPackage.job.company, jobTitle: applicationPackage.job.title },
      category: "engine",
    });

    // Create engine with registry
    const registry = buildRegistry();
    const engine = new CoreAutomationEngine({ registry });

    // Launch browser and run automation
    const playwright = await loadPlaywright();
    const browser = await playwright.chromium.launch({ headless: true });
    const rawPage = await browser.newPage() as PlaywrightPage;
    const page = await wrapPlaywrightPage(rawPage);

    // Create hooks with screenshot capture and state persistence
    const hooks = createEngineHooks({
      userId,
      jobId,
      runId,
      uploadScreenshot: async (label: string) => {
        return captureAndUploadScreenshot(page, userId, jobId, label);
      },
      requestUserConfirmation: this.deps.requestUserConfirmation,
      isAborted: this.deps.isAborted,
      logSink: this.deps.logSink,
      persistState: async (phase, step, fieldIndex, completedActions) => {
        await statePersistenceService.updateRunState(userId, runId, {
          executionState: {
            phase: phase as any,
            currentStepIndex: step,
            fieldIndex,
            completedActions,
            currentUrl: applicationPackage.job.applyUrl || "",
            lastAction: phase,
            adapterId: "",
            usedGenericFallback: false,
            filledFields: 0,
            skippedFields: 0,
            userAnsweredFields: 0,
          },
        });
      },
      page, // Pass page instance for actual screenshot capture
    });

    try {
      // Navigate to job URL
      const jobUrl = applicationPackage.job.applyUrl || "";
      if (!jobUrl) {
        throw new Error("Job URL not found in application package.");
      }
      await page.goto(jobUrl);
      await page.waitForLoadState("networkidle").catch(() => {});

      // Run automation
      const result = await engine.run(page, ctx, hooks);

      // Complete state
      await statePersistenceService.completeRun(userId, runId, result.state, {
        adapterId: result.adapterId,
        usedGenericFallback: result.usedGenericFallback,
        totalFields: result.filledFields + result.skippedFields + result.userAnsweredFields,
        filledFields: result.filledFields,
        skippedFields: result.skippedFields,
        userAnsweredFields: result.userAnsweredFields,
      });

      // Update execution state in persistence
      await statePersistenceService.updateRunState(userId, runId, {
        executionState: {
          phase: "completed",
          currentStepIndex: 0,
          currentUrl: applicationPackage.job.applyUrl || "",
          lastAction: "completed",
          adapterId: result.adapterId,
          usedGenericFallback: result.usedGenericFallback,
          filledFields: result.filledFields,
          skippedFields: result.skippedFields,
          userAnsweredFields: result.userAnsweredFields,
          fieldIndex: 0,
          completedActions: [],
        },
      });

      return result;
    } catch (error) {
      // Handle error state
      await statePersistenceService.pauseRun(userId, runId, {
        reason: "error",
        step: "automation",
        phase: "error",
        error: {
          message: error instanceof Error ? error.message : "Unknown error",
          step: "automation",
          timestamp: new Date().toISOString(),
        },
        fieldState: {
          filledFieldIds: [],
          pendingFieldIds: [],
          skippedFieldIds: [],
        },
      });
      throw error;
    } finally {
      await browser.close();
    }
  }

  /**
   * Pause current automation run
   */
  async pause(reason: string): Promise<void> {
    if (!this.currentRunId) {
      throw new Error("No active run to pause.");
    }

    const { userId, jobId } = this.options;
    await statePersistenceService.pauseRun(userId, this.currentRunId, {
      reason,
      step: "user_paused",
      phase: "paused",
    });
  }

  /**
   * Resume a paused automation run
   */
  async resume(runId: string): Promise<AutomationResult> {
    const { userId, jobId, confidenceThreshold } = this.options;

    // Load saved state
    const savedState = await statePersistenceService.resumeRun(userId, runId);
    if (!savedState) {
      throw new Error("Run state not found.");
    }

    // Reconstruct context from saved state
    const applicationPackage = await loadApplicationPackage(userId, jobId);
    if (!applicationPackage) {
      throw new Error("Application package not found.");
    }

    const resumeProfile = await this.deps.getResumeProfile();
    if (!resumeProfile) {
      throw new Error("Resume profile not found.");
    }

    const userProfile = mapResumeProfileToUserProfile(resumeProfile, userId);
    
    if (!applicationPackage.tailoredResume) {
      throw new Error("Tailored resume not found in application package.");
    }

    const resumePDF = await this.deps.generateResumePDF(applicationPackage.tailoredResume.content);
    const coverLetterPDF = applicationPackage.coverLetter
      ? await this.deps.generateCoverLetterPDF(applicationPackage.coverLetter.content)
      : undefined;

    const resolverInputs: ResolverInputs = {
      profile: userProfile,
      resume: {
        id: applicationPackage.job.id,
        label: applicationPackage.tailoredResume.versionLabel,
        fileRef: resumePDF,
        fileName: "tailored-resume.pdf",
        contentType: "application/pdf",
      },
      coverLetter: coverLetterPDF && applicationPackage.coverLetter
        ? {
            id: "cover-letter",
            label: "Cover Letter",
            fileRef: coverLetterPDF,
            fileName: "cover-letter.pdf",
            contentType: "application/pdf",
            bodyText: applicationPackage.coverLetter.content,
          }
        : undefined,
      resumePath: resumePDF,
      coverLetterPath: coverLetterPDF,
    };

    const ctx: AutomationRunContext = {
      runId: savedState.runId,
      userId,
      job: savedState.context,
      resolver: resolverInputs,
      confidenceThreshold: confidenceThreshold ?? 0.7,
      resumeState: {
        phase: savedState.executionState.phase,
        currentStepIndex: savedState.executionState.currentStepIndex,
        filledFieldIds: savedState.fieldState.filledFieldIds,
        skippedFieldIds: savedState.fieldState.skippedFieldIds,
        lastAction: savedState.executionState.lastAction,
        fieldIndex: savedState.executionState.fieldIndex,
        completedActions: savedState.executionState.completedActions,
        pendingConfirmation: savedState.pendingConfirmation,
      },
    };

    this.currentRunId = runId;

    // Launch browser and resume automation
    const playwright = await loadPlaywright();
    const browser = await playwright.chromium.launch({ headless: true });
    const rawPage = await browser.newPage() as PlaywrightPage;
    const page = await wrapPlaywrightPage(rawPage);

    // Recreate engine and hooks with screenshot capture and state persistence
    const registry = buildRegistry();
    const engine = new CoreAutomationEngine({ registry });
    const hooks = createEngineHooks({
      userId,
      jobId,
      runId,
      uploadScreenshot: async (label: string) => {
        return captureAndUploadScreenshot(page, userId, jobId, label);
      },
      requestUserConfirmation: this.deps.requestUserConfirmation,
      isAborted: this.deps.isAborted,
      logSink: this.deps.logSink,
      persistState: async (phase, step, fieldIndex, completedActions) => {
        await statePersistenceService.updateRunState(userId, runId, {
          executionState: {
            phase: phase as any,
            currentStepIndex: step,
            fieldIndex,
            completedActions,
            currentUrl: savedState.context.jobUrl,
            lastAction: phase,
            adapterId: savedState.executionState.adapterId,
            usedGenericFallback: savedState.executionState.usedGenericFallback,
            filledFields: savedState.executionState.filledFields,
            skippedFields: savedState.executionState.skippedFields,
            userAnsweredFields: savedState.executionState.userAnsweredFields,
          },
        });
      },
      page, // Pass page instance for actual screenshot capture
    });

    try {
      // Navigate to job URL
      await page.goto(savedState.context.jobUrl);
      await page.waitForLoadState("networkidle").catch(() => {});

      // Run automation (engine will handle resuming from saved state)
      const result = await engine.run(page, ctx, hooks);

      // Complete state
      await statePersistenceService.completeRun(userId, runId, result.state, {
        adapterId: result.adapterId,
        usedGenericFallback: result.usedGenericFallback,
        totalFields: result.filledFields + result.skippedFields + result.userAnsweredFields,
        filledFields: result.filledFields,
        skippedFields: result.skippedFields,
        userAnsweredFields: result.userAnsweredFields,
      });

      return result;
    } finally {
      await browser.close();
    }
  }

  /**
   * Cancel current automation run
   */
  async cancel(): Promise<void> {
    if (!this.currentRunId) {
      throw new Error("No active run to cancel.");
    }

    const { userId } = this.options;
    await statePersistenceService.completeRun(userId, this.currentRunId, "aborted");
    await statePersistenceService.deleteRunState(userId, this.currentRunId);
    this.currentRunId = null;
  }

  /**
   * Get current run status
   */
  async getStatus(runId?: string): Promise<AutomationRunState | null> {
    const { userId } = this.options;
    const targetRunId = runId || this.currentRunId;
    
    if (!targetRunId) {
      return null;
    }

    return statePersistenceService.loadRunState(userId, targetRunId);
  }
}
