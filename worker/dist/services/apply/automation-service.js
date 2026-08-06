"use strict";
/**
 * Automation service - integrates all automation components
 * Main entry point for Phase 3 automation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutomationService = void 0;
const core_engine_1 = require("./engine/core-engine");
const adapters_1 = require("./adapters");
const hooks_1 = require("./engine/hooks");
const tracker_1 = require("./tracker");
// TODO: Move to worker if needed
const answer_resolver_1 = require("./answer-resolver");
// TODO: Move to worker if needed
const browser_adapter_1 = require("./browser-adapter");
const state_persistence_1 = require("./state-persistence");
const screenshot_service_1 = require("./screenshot-service");
const logging_service_1 = require("./logging-service");
class AutomationService {
    constructor(deps, options) {
        var _a;
        this.currentRunId = null;
        this.deps = deps;
        this.options = options;
        this.currentRunId = (_a = deps.runId) !== null && _a !== void 0 ? _a : null;
    }
    /**
     * Run complete automation flow
     */
    async run() {
        const { userId, jobId, confidenceThreshold } = this.options;
        // Load application package
        const applicationPackage = await (0, tracker_1.loadApplicationPackage)(userId, jobId);
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
        const userProfile = (0, answer_resolver_1.mapResumeProfileToUserProfile)(resumeProfile, userId);
        // Generate PDF files for upload
        const resumePDF = await this.deps.generateResumePDF(applicationPackage.tailoredResume.content);
        const coverLetterPDF = applicationPackage.coverLetter
            ? await this.deps.generateCoverLetterPDF(applicationPackage.coverLetter.content)
            : undefined;
        // Create resolver inputs
        const resolverInputs = {
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
        const ctx = {
            runId,
            userId,
            job: {
                company: applicationPackage.job.company,
                jobTitle: applicationPackage.job.title,
                jobUrl: applicationPackage.job.applyUrl || "",
                source: applicationPackage.job.source || "unknown",
            },
            resolver: resolverInputs,
            confidenceThreshold: confidenceThreshold !== null && confidenceThreshold !== void 0 ? confidenceThreshold : 0.7,
        };
        // Initialize state persistence
        await state_persistence_1.statePersistenceService.initializeRun({
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
        await logging_service_1.automationLoggingService.log({
            runId,
            userId,
            jobId,
            level: "info",
            message: "Automation started",
            data: { company: applicationPackage.job.company, jobTitle: applicationPackage.job.title },
            category: "engine",
        });
        // Create engine with registry
        const registry = (0, adapters_1.buildRegistry)();
        const engine = new core_engine_1.CoreAutomationEngine({ registry });
        // Launch browser and run automation
        const playwright = await (0, browser_adapter_1.loadPlaywright)();
        const browser = await playwright.chromium.launch({ headless: true });
        const rawPage = await browser.newPage();
        const page = await (0, browser_adapter_1.wrapPlaywrightPage)(rawPage);
        // Create hooks with screenshot capture and state persistence
        const hooks = (0, hooks_1.createEngineHooks)({
            userId,
            jobId,
            runId,
            uploadScreenshot: async (label) => {
                return (0, screenshot_service_1.captureAndUploadScreenshot)(page, userId, jobId, label);
            },
            requestUserConfirmation: this.deps.requestUserConfirmation,
            isAborted: this.deps.isAborted,
            logSink: this.deps.logSink,
            persistState: async (phase, step, fieldIndex, completedActions) => {
                await state_persistence_1.statePersistenceService.updateRunState(userId, runId, {
                    executionState: {
                        phase: phase,
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
            await page.waitForLoadState("networkidle").catch(() => { });
            // Run automation
            const result = await engine.run(page, ctx, hooks);
            // Complete state
            await state_persistence_1.statePersistenceService.completeRun(userId, runId, result.state, {
                adapterId: result.adapterId,
                usedGenericFallback: result.usedGenericFallback,
                totalFields: result.filledFields + result.skippedFields + result.userAnsweredFields,
                filledFields: result.filledFields,
                skippedFields: result.skippedFields,
                userAnsweredFields: result.userAnsweredFields,
            });
            // Update execution state in persistence
            await state_persistence_1.statePersistenceService.updateRunState(userId, runId, {
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
        }
        catch (error) {
            // Handle error state
            await state_persistence_1.statePersistenceService.pauseRun(userId, runId, {
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
        }
        finally {
            await browser.close();
        }
    }
    /**
     * Pause current automation run
     */
    async pause(reason) {
        if (!this.currentRunId) {
            throw new Error("No active run to pause.");
        }
        const { userId, jobId } = this.options;
        await state_persistence_1.statePersistenceService.pauseRun(userId, this.currentRunId, {
            reason,
            step: "user_paused",
            phase: "paused",
        });
    }
    /**
     * Resume a paused automation run
     */
    async resume(runId) {
        const { userId, jobId, confidenceThreshold } = this.options;
        // Load saved state
        const savedState = await state_persistence_1.statePersistenceService.resumeRun(userId, runId);
        if (!savedState) {
            throw new Error("Run state not found.");
        }
        // Reconstruct context from saved state
        const applicationPackage = await (0, tracker_1.loadApplicationPackage)(userId, jobId);
        if (!applicationPackage) {
            throw new Error("Application package not found.");
        }
        const resumeProfile = await this.deps.getResumeProfile();
        if (!resumeProfile) {
            throw new Error("Resume profile not found.");
        }
        const userProfile = (0, answer_resolver_1.mapResumeProfileToUserProfile)(resumeProfile, userId);
        if (!applicationPackage.tailoredResume) {
            throw new Error("Tailored resume not found in application package.");
        }
        const resumePDF = await this.deps.generateResumePDF(applicationPackage.tailoredResume.content);
        const coverLetterPDF = applicationPackage.coverLetter
            ? await this.deps.generateCoverLetterPDF(applicationPackage.coverLetter.content)
            : undefined;
        const resolverInputs = {
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
        const ctx = {
            runId: savedState.runId,
            userId,
            job: savedState.context,
            resolver: resolverInputs,
            confidenceThreshold: confidenceThreshold !== null && confidenceThreshold !== void 0 ? confidenceThreshold : 0.7,
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
        const playwright = await (0, browser_adapter_1.loadPlaywright)();
        const browser = await playwright.chromium.launch({ headless: true });
        const rawPage = await browser.newPage();
        const page = await (0, browser_adapter_1.wrapPlaywrightPage)(rawPage);
        // Recreate engine and hooks with screenshot capture and state persistence
        const registry = (0, adapters_1.buildRegistry)();
        const engine = new core_engine_1.CoreAutomationEngine({ registry });
        const hooks = (0, hooks_1.createEngineHooks)({
            userId,
            jobId,
            runId,
            uploadScreenshot: async (label) => {
                return (0, screenshot_service_1.captureAndUploadScreenshot)(page, userId, jobId, label);
            },
            requestUserConfirmation: this.deps.requestUserConfirmation,
            isAborted: this.deps.isAborted,
            logSink: this.deps.logSink,
            persistState: async (phase, step, fieldIndex, completedActions) => {
                await state_persistence_1.statePersistenceService.updateRunState(userId, runId, {
                    executionState: {
                        phase: phase,
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
            await page.waitForLoadState("networkidle").catch(() => { });
            // Run automation (engine will handle resuming from saved state)
            const result = await engine.run(page, ctx, hooks);
            // Complete state
            await state_persistence_1.statePersistenceService.completeRun(userId, runId, result.state, {
                adapterId: result.adapterId,
                usedGenericFallback: result.usedGenericFallback,
                totalFields: result.filledFields + result.skippedFields + result.userAnsweredFields,
                filledFields: result.filledFields,
                skippedFields: result.skippedFields,
                userAnsweredFields: result.userAnsweredFields,
            });
            return result;
        }
        finally {
            await browser.close();
        }
    }
    /**
     * Cancel current automation run
     */
    async cancel() {
        if (!this.currentRunId) {
            throw new Error("No active run to cancel.");
        }
        const { userId } = this.options;
        await state_persistence_1.statePersistenceService.completeRun(userId, this.currentRunId, "aborted");
        await state_persistence_1.statePersistenceService.deleteRunState(userId, this.currentRunId);
        this.currentRunId = null;
    }
    /**
     * Get current run status
     */
    async getStatus(runId) {
        const { userId } = this.options;
        const targetRunId = runId || this.currentRunId;
        if (!targetRunId) {
            return null;
        }
        return state_persistence_1.statePersistenceService.loadRunState(userId, targetRunId);
    }
}
exports.AutomationService = AutomationService;
