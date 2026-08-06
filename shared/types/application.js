"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.APPLICATION_STATUS_LABELS = exports.ApplicationStatus = void 0;
/**
 * Application status type (for existing code compatibility)
 */
var ApplicationStatus;
(function (ApplicationStatus) {
    ApplicationStatus["NOT_APPLIED"] = "not_applied";
    ApplicationStatus["PREPARING"] = "preparing";
    ApplicationStatus["READY"] = "ready";
    ApplicationStatus["APPLIED"] = "applied";
    ApplicationStatus["DRAFT"] = "draft";
    ApplicationStatus["REVIEWED"] = "reviewed";
    ApplicationStatus["SUBMITTED"] = "submitted";
    ApplicationStatus["APPLYING"] = "applying";
    ApplicationStatus["REVIEW_REQUIRED"] = "review_required";
    ApplicationStatus["INTERVIEW"] = "interview";
    ApplicationStatus["OFFER"] = "offer";
    ApplicationStatus["REJECTED"] = "rejected";
})(ApplicationStatus || (exports.ApplicationStatus = ApplicationStatus = {}));
/**
 * Application status labels (for existing code compatibility)
 */
exports.APPLICATION_STATUS_LABELS = {
    not_applied: "Not Applied",
    preparing: "Preparing",
    ready: "Ready",
    applied: "Applied",
    draft: "Draft",
    reviewed: "Reviewed",
    submitted: "Submitted",
    applying: "Applying",
    review_required: "Review Required",
    interview: "Interview",
    offer: "Offer",
    rejected: "Rejected",
};
