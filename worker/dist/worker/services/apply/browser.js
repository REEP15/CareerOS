"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startApplication = startApplication;
const playwright_1 = require("./playwright");
const logger_1 = require("./logger");
const tracker_1 = require("./tracker");
const application_1 = require("@/types/application");
const notifications_1 = require("../notifications/notifications");
const notification_1 = require("@/types/notification");
async function startApplication(uid, jobId) {
    var _a, _b, _c, _d;
    (0, logger_1.logApply)("info", "Starting application", { jobId });
    const applicationPackage = await (0, tracker_1.loadApplicationPackage)(uid, jobId);
    await (0, tracker_1.upsertApplication)(uid, {
        jobId,
        status: application_1.ApplicationStatus.APPLYING,
        resumeVersion: (_a = applicationPackage.application.resumeVersion) !== null && _a !== void 0 ? _a : (_b = applicationPackage.tailoredResume) === null || _b === void 0 ? void 0 : _b.versionLabel,
        coverLetterVersion: (_c = applicationPackage.application.coverLetterVersion) !== null && _c !== void 0 ? _c : (_d = applicationPackage.coverLetter) === null || _d === void 0 ? void 0 : _d.versionLabel,
        timelineNote: "Playwright session started",
    });
    try {
        const result = await (0, playwright_1.launchApplicationBrowser)(uid, applicationPackage);
        await (0, tracker_1.upsertApplication)(uid, {
            jobId,
            status: application_1.ApplicationStatus.REVIEW_REQUIRED,
            timelineNote: result.reviewPageReached
                ? "Stopped on review page for manual submission"
                : "Form filled — manual review required",
        });
        await (0, notifications_1.createNotification)(uid, {
            type: notification_1.NotificationType.APPLICATION_COMPLETE,
            title: "Application Ready for Review",
            message: `Application for ${applicationPackage.job.title} at ${applicationPackage.job.company} is ready for manual review.`,
            link: `/jobs/${jobId}`,
        });
        return {
            jobId,
            status: application_1.ApplicationStatus.REVIEW_REQUIRED,
            paused: result.paused,
            message: result.message,
            unknownFields: result.unknownFields,
        };
    }
    catch (error) {
        await (0, tracker_1.upsertApplication)(uid, {
            jobId,
            status: application_1.ApplicationStatus.READY,
            timelineNote: `Apply session failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
        throw error;
    }
}
