"use strict";
/**
 * Engine hooks implementation - connects engine to CareerOS services
 * Bridges between orchestration engine and existing CareerOS infrastructure
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEngineHooks = createEngineHooks;
const tracker_1 = require("../tracker");
const application_1 = require("@/types/application");
const screenshot_service_1 = require("../screenshot-service");
const logging_service_1 = require("../logging-service");
function createEngineHooks(deps) {
    return {
        log: (level, message, data) => {
            var _a;
            (_a = deps.logSink) === null || _a === void 0 ? void 0 : _a.call(deps, level, message, data);
            // Log to existing CareerOS logging system
            console.log(`[${level.toUpperCase()}] ${message}`, data);
            // Log to structured logging service (non-blocking)
            logging_service_1.automationLoggingService.log({
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
            let screenshotUrl;
            if (deps.page) {
                // Use actual screenshot capture if page is available
                screenshotUrl = await (0, screenshot_service_1.captureAndUploadScreenshot)(deps.page, deps.userId, deps.jobId, label);
            }
            else {
                // Fall back to placeholder
                screenshotUrl = await deps.uploadScreenshot(label);
            }
            // Log screenshot capture with URL for linking
            logging_service_1.automationLoggingService.log({
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
            await (0, tracker_1.upsertApplication)(deps.userId, {
                jobId: deps.jobId,
                status: application_1.ApplicationStatus.REVIEW_REQUIRED,
                timelineNote: `Awaiting user confirmation: ${req.reason}`,
            });
            const response = await deps.requestUserConfirmation(req);
            // Update application status after user response
            await (0, tracker_1.upsertApplication)(deps.userId, {
                jobId: deps.jobId,
                status: response.abort ? application_1.ApplicationStatus.READY : application_1.ApplicationStatus.APPLYING,
                timelineNote: response.abort ? "User cancelled automation" : "User provided input",
            });
            return response;
        },
        onFieldFilled: (field, answer) => {
            // Log field fill event to application timeline
            (0, tracker_1.upsertApplication)(deps.userId, {
                jobId: deps.jobId,
                status: application_1.ApplicationStatus.APPLYING,
                timelineNote: `Filled ${field.semantic} (${answer.source})`,
            }).catch(() => { }); // Don't block on logging
        },
        isAborted: () => deps.isAborted(),
        persistState: async (phase, step, fieldIndex, completedActions) => {
            if (deps.persistState) {
                await deps.persistState(phase, step, fieldIndex, completedActions);
            }
        },
    };
}
