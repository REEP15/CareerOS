"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSubmitPauseMessage = getSubmitPauseMessage;
function getSubmitPauseMessage(unknownFields = [], reviewPageReached = false) {
    const parts = [
        "Application form prepared. Review every field in the browser and submit manually when ready.",
    ];
    if (unknownFields.length > 0) {
        parts.push(`Unknown fields detected (${unknownFields.length}): ${unknownFields
            .slice(0, 5)
            .join(", ")}${unknownFields.length > 5 ? "..." : ""}. Fill these manually before submitting.`);
    }
    if (reviewPageReached) {
        parts.push("Final review page detected. Verify all information before submitting.");
    }
    parts.push("CareerOS will never auto-submit, solve CAPTCHAs, or bypass anti-bot protections.");
    return parts.join(" ");
}
