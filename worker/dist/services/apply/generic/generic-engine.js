"use strict";
/**
 * Generic engine - best-effort, selector-agnostic form filling
 * Mirrors v0_phase3/generic/generic-engine.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.fillForm = fillForm;
const answer_resolver_1 = require("../answer-resolver");
const field_filler_1 = require("./field-filler");
const field_classifier_1 = require("../field-classifier");
const field_scanner_1 = require("./field-scanner");
/** Turn adapter hints into described fields, tagged as authoritative. */
async function resolveHints(formPage, hints) {
    const out = [];
    for (const hint of hints) {
        const el = await formPage.query(hint.selector).catch(() => null);
        if (!el)
            continue;
        const described = await (0, field_scanner_1.describeControl)(el, hint.semantic);
        if (described)
            out.push(described);
    }
    return out;
}
function confirmationQuestion(field) {
    var _a, _b, _c, _d;
    const label = (_d = (_c = (_b = (_a = field.signals.labelText) !== null && _a !== void 0 ? _a : field.signals.ariaLabel) !== null && _b !== void 0 ? _b : field.signals.placeholder) !== null && _c !== void 0 ? _c : field.signals.name) !== null && _d !== void 0 ? _d : "this field";
    if (field_classifier_1.SENSITIVE_SEMANTICS.has(field.semantic)) {
        return `"${label}" is a voluntary/EEO question. How would you like to answer (or skip)?`;
    }
    if (field.semantic === "unknown") {
        return `We couldn't confidently understand "${label}". What should we enter?`;
    }
    return `Please confirm the value for "${label}".`;
}
/**
 * Fill every field on `formPage` for the current step.
 */
async function fillForm(formPage, ctx, hooks, hints = []) {
    var _a;
    const summary = {
        filled: 0,
        skipped: 0,
        userAnswered: 0,
        aborted: false,
        filledFieldIds: [],
    };
    const hinted = await resolveHints(formPage, hints);
    const hintedKeys = new Set(hinted.map((h) => (0, field_scanner_1.fieldKey)(h.field)));
    const scanned = (await (0, field_scanner_1.scanFields)(formPage)).filter((s) => !hintedKeys.has((0, field_scanner_1.fieldKey)(s.field)));
    const all = [...hinted, ...scanned];
    hooks.log("info", `Detected ${all.length} field(s) on current step`, {
        hinted: hinted.length,
        scanned: scanned.length,
    });
    for (const { field, element } of all) {
        if (hooks.isAborted()) {
            summary.aborted = true;
            return summary;
        }
        // Leave already-populated non-file fields untouched unless they're wrong;
        // we don't clobber a user's manual edits.
        if (field.prefilled && field.kind !== "file") {
            summary.skipped++;
            continue;
        }
        let answer = (0, answer_resolver_1.resolveAnswer)(field, ctx.resolver);
        const needsUser = !answer ||
            answer.confidence < ctx.confidenceThreshold ||
            field_classifier_1.SENSITIVE_SEMANTICS.has(field.semantic);
        if (needsUser) {
            const req = {
                runId: ctx.runId,
                reason: !answer
                    ? "unanswerable_from_profile"
                    : field_classifier_1.SENSITIVE_SEMANTICS.has(field.semantic)
                        ? "sensitive_question"
                        : "low_confidence",
                field,
                proposedAnswer: answer !== null && answer !== void 0 ? answer : undefined,
                question: confirmationQuestion(field),
                options: field.options,
            };
            const response = await hooks.requestConfirmation(req);
            if (response.abort) {
                summary.aborted = true;
                return summary;
            }
            if (!response.answered || !response.answer) {
                // User chose to skip (e.g. optional/voluntary field).
                summary.skipped++;
                continue;
            }
            answer = {
                fieldId: field.id,
                semantic: field.semantic,
                confidence: 1,
                source: "user_provided",
                rationale: "Provided by the user during confirmation",
                ...response.answer,
            };
            summary.userAnswered++;
        }
        const outcome = await (0, field_filler_1.fillField)(element, field.kind, answer);
        if (outcome.ok) {
            summary.filled++;
            summary.filledFieldIds.push(field.id);
            (_a = hooks.onFieldFilled) === null || _a === void 0 ? void 0 : _a.call(hooks, field, answer);
            hooks.log("debug", `Filled ${field.semantic}`, {
                source: answer.source,
                confidence: answer.confidence,
            });
        }
        else {
            summary.skipped++;
            hooks.log("warn", `Could not fill ${field.semantic}: ${outcome.reason}`);
        }
    }
    return summary;
}
