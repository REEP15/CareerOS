"use strict";
/**
 * Core automation engine - orchestration layer
 * Mirrors v0_phase3/engine/core-engine.ts with CareerOS integration
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoreAutomationEngine = void 0;
const controls_1 = require("./controls");
const generic_engine_1 = require("../generic/generic-engine");
const MAX_STEPS = 15; // Guard against runaway multi-step loops
/** A no-op adapter representing the generic fallback path. */
function genericAdapter() {
    return {
        id: "generic",
        displayName: "Generic (semantic detection)",
        matches: async () => true,
        openApplicationForm: async (page) => page,
        async advanceStep(formPage) {
            const next = await (0, controls_1.findAdvanceControl)(formPage);
            if (!next || !(await next.isEnabled()))
                return { advanced: false };
            await next.click();
            await formPage.waitForLoadState("networkidle").catch(() => { });
            return { advanced: true };
        },
        locateSubmit: (formPage) => (0, controls_1.findSubmitControl)(formPage),
    };
}
class CoreAutomationEngine {
    constructor(options) {
        var _a;
        this.registry = options.registry;
        this.defaultThreshold = (_a = options.defaultConfidenceThreshold) !== null && _a !== void 0 ? _a : 0.7;
    }
    /**
     * Run the full application flow on `page`. The engine mutates nothing in
     * CareerOS directly; it reports through `hooks` so the worker/tracker persist
     * state and surface confirmations.
     */
    async run(page, ctx, hooks) {
        var _a, _b, _c, _d, _e, _f;
        const threshold = ctx.confidenceThreshold || this.defaultThreshold;
        const runCtx = { ...ctx, confidenceThreshold: threshold };
        const detected = await this.registry.detect(page);
        const adapter = detected !== null && detected !== void 0 ? detected : genericAdapter();
        const usedGenericFallback = !detected;
        const result = {
            runId: ctx.runId,
            state: "detecting",
            adapterId: adapter.id,
            usedGenericFallback,
            filledFields: 0,
            skippedFields: 0,
            userAnsweredFields: 0,
        };
        // If resuming, initialize counts and phase from saved state
        let currentPhase = "detecting";
        let currentStep = 0;
        let currentFieldIndex = 0;
        let formPage = page; // Default to current page
        if (runCtx.resumeState) {
            currentPhase = runCtx.resumeState.phase;
            currentStep = runCtx.resumeState.currentStepIndex;
            currentFieldIndex = runCtx.resumeState.fieldIndex;
            result.filledFields = runCtx.resumeState.filledFieldIds.length;
            result.skippedFields = runCtx.resumeState.skippedFieldIds.length;
            hooks.log("info", `Resuming from phase: ${currentPhase}, step: ${currentStep}, fieldIndex: ${currentFieldIndex}`, {
                filledFields: result.filledFields,
                completedActions: runCtx.resumeState.completedActions,
            });
        }
        hooks.log("info", `Detected platform: ${adapter.displayName}`, {
            adapterId: adapter.id,
            usedGenericFallback,
        });
        try {
            // Phase 1: Opening the form (skip if already completed)
            const openFormActionId = `open-form-${ctx.runId}`;
            if (currentPhase === "detecting" || currentPhase === "navigating" || currentPhase === "opening_form") {
                if (!runCtx.resumeState || !runCtx.resumeState.completedActions.includes(openFormActionId)) {
                    currentPhase = "opening_form";
                    hooks.log("info", "Phase: opening_form");
                    formPage = await adapter.openApplicationForm(page, runCtx, hooks);
                    await hooks.captureScreenshot("form-opened");
                    // Mark this action as completed and persist state
                    if (runCtx.resumeState) {
                        runCtx.resumeState.completedActions.push(openFormActionId);
                    }
                    await ((_a = hooks.persistState) === null || _a === void 0 ? void 0 : _a.call(hooks, currentPhase, currentStep, currentFieldIndex, ((_b = runCtx.resumeState) === null || _b === void 0 ? void 0 : _b.completedActions) || []));
                }
                else {
                    hooks.log("info", "Skipping completed phase: opening_form");
                    formPage = page; // Already on form page
                }
            }
            else {
                formPage = page; // Resume from current phase
            }
            result.state = "filling";
            currentPhase = "filling_fields";
            // Phase 2: Filling fields (multi-step loop)
            while (currentStep < MAX_STEPS) {
                if (hooks.isAborted())
                    return this.finalize(result, "aborted");
                hooks.log("info", `Phase: filling_fields, step: ${currentStep}, fieldIndex: ${currentFieldIndex}`);
                const hints = (_d = (await ((_c = adapter.fieldHints) === null || _c === void 0 ? void 0 : _c.call(adapter, formPage)))) !== null && _d !== void 0 ? _d : [];
                // If resuming, filter out already-filled fields and skip to current field index
                const filteredHints = runCtx.resumeState
                    ? hints.filter(hint => !runCtx.resumeState.filledFieldIds.includes(hint.selector))
                    : hints;
                // Skip fields before current field index if resuming
                const hintsToProcess = runCtx.resumeState && currentFieldIndex > 0
                    ? filteredHints.slice(currentFieldIndex)
                    : filteredHints;
                const summary = await this.fillForm(formPage, runCtx, hooks, hintsToProcess);
                result.filledFields += summary.filled;
                result.skippedFields += summary.skipped;
                result.userAnsweredFields += summary.userAnswered;
                if (summary.aborted)
                    return this.finalize(result, "aborted");
                await hooks.captureScreenshot(`step-${currentStep}-filled`);
                // Mark this step as completed and persist state
                const stepActionId = `fill-step-${currentStep}`;
                if (runCtx.resumeState && !runCtx.resumeState.completedActions.includes(stepActionId)) {
                    runCtx.resumeState.completedActions.push(stepActionId);
                }
                await ((_e = hooks.persistState) === null || _e === void 0 ? void 0 : _e.call(hooks, currentPhase, currentStep, currentFieldIndex, ((_f = runCtx.resumeState) === null || _f === void 0 ? void 0 : _f.completedActions) || []));
                // Reset field index for next step
                currentFieldIndex = 0;
                // Phase 3: Advancing to next step
                currentPhase = "advancing_step";
                hooks.log("info", "Phase: advancing_step");
                const advance = adapter.advanceStep
                    ? await adapter.advanceStep(formPage, runCtx, hooks)
                    : { advanced: false };
                if (!advance.advanced)
                    break;
                // Mark advance as completed
                const advanceActionId = `advance-step-${currentStep}`;
                if (runCtx.resumeState && !runCtx.resumeState.completedActions.includes(advanceActionId)) {
                    runCtx.resumeState.completedActions.push(advanceActionId);
                }
                currentStep++;
            }
            // Phase 4: Ready for review
            currentPhase = "ready_for_review";
            result.state = "ready_for_review";
            await hooks.captureScreenshot("ready-for-review");
            await adapter.locateSubmit(formPage);
            await hooks.requestConfirmation({
                runId: ctx.runId,
                reason: "final_submit",
                question: "The application is filled and ready for your manual review. CareerOS will not submit it automatically.",
            });
            hooks.log("info", "Application staged for manual review; automatic submission is disabled.");
            return this.finalize(result, "completed_manual");
        }
        catch (err) {
            const reason = err instanceof Error ? err.message : "Unknown engine error";
            hooks.log("error", `Automation failed: ${reason}`);
            await hooks.captureScreenshot("failure").catch(() => { });
            return this.finalize(result, "failed", reason);
        }
    }
    finalize(result, state, failureReason) {
        return { ...result, state, failureReason };
    }
    /**
     * Fill form using generic engine
     */
    async fillForm(formPage, ctx, hooks, hints) {
        return (0, generic_engine_1.fillForm)(formPage, ctx, hooks, hints);
    }
}
exports.CoreAutomationEngine = CoreAutomationEngine;
