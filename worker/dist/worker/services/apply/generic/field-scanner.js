"use strict";
/**
 * Field scanner - discovers and classifies form fields
 * Mirrors v0_phase3/generic/field-scanner.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.describeControl = describeControl;
exports.fieldKey = fieldKey;
exports.scanFields = scanFields;
const field_classifier_1 = require("../field-classifier");
const CONTROL_SELECTOR = [
    "input:not([type=hidden]):not([type=submit]):not([type=button])",
    "textarea",
    "select",
    "[role=combobox]",
    "[role=radiogroup]",
    "[contenteditable=true]",
].join(",");
let fieldCounter = 0;
async function normalizeKind(el) {
    var _a, _b;
    const tag = (await el.tagName()).toLowerCase();
    if (tag === "textarea")
        return "textarea";
    if (tag === "select")
        return "select";
    const role = await el.getAttribute("role");
    if (role === "combobox")
        return "combobox";
    if (role === "radiogroup")
        return "radio_group";
    if (tag === "input") {
        const type = (_b = (_a = (await el.getAttribute("type"))) === null || _a === void 0 ? void 0 : _a.toLowerCase()) !== null && _b !== void 0 ? _b : "text";
        switch (type) {
            case "email":
                return "email";
            case "tel":
                return "tel";
            case "url":
                return "url";
            case "number":
                return "number";
            case "file":
                return "file";
            case "date":
                return "date";
            case "radio":
                return "radio_group";
            case "checkbox":
                return "checkbox";
            default:
                return "text";
        }
    }
    return "unknown";
}
async function harvestSignals(el) {
    const [tagName, inputType, role, name, idAttr, labelText, placeholder, ariaLabel, ariaDescribedByText, autocomplete, nearbyText, requiredAttr, ariaRequired,] = await Promise.all([
        el.tagName(),
        el.getAttribute("type"),
        el.getAttribute("role"),
        el.getAttribute("name"),
        el.getAttribute("id"),
        el.accessibleLabel(),
        el.getAttribute("placeholder"),
        el.getAttribute("aria-label"),
        el.describedByText(),
        el.getAttribute("autocomplete"),
        el.nearbyText(),
        el.getAttribute("required"),
        el.getAttribute("aria-required"),
    ]);
    return {
        tagName,
        inputType,
        role,
        name,
        idAttr,
        labelText,
        placeholder,
        ariaLabel,
        ariaDescribedByText,
        autocomplete,
        nearbyText,
        required: requiredAttr != null || ariaRequired === "true",
    };
}
async function readOptions(el, kind) {
    if (kind === "select" || kind === "radio_group") {
        const opts = await el.options().catch(() => []);
        return opts.length ? opts : undefined;
    }
    return undefined;
}
/**
 * Fully describe a single control: normalize its kind, harvest signals, read
 * options, and classify it.
 */
async function describeControl(el, semanticOverride) {
    var _a;
    if (!(await el.isVisible()))
        return null;
    const kind = await normalizeKind(el);
    const signals = await harvestSignals(el);
    const classified = (0, field_classifier_1.classifyField)(signals, kind);
    const currentValue = await el.inputValue().catch(() => "");
    const options = await readOptions(el, kind);
    return {
        field: {
            id: `f_${++fieldCounter}`,
            kind,
            semantic: semanticOverride !== null && semanticOverride !== void 0 ? semanticOverride : classified.semantic,
            classificationConfidence: semanticOverride ? 0.98 : classified.confidence,
            required: (_a = signals.required) !== null && _a !== void 0 ? _a : false,
            signals,
            options,
            prefilled: currentValue.trim().length > 0,
        },
        element: el,
    };
}
/** A stable identity for a field, used to de-duplicate hinted vs scanned. */
function fieldKey(field) {
    const s = field.signals;
    return [s.name, s.idAttr, s.labelText, s.ariaLabel, s.placeholder]
        .map((x) => (x !== null && x !== void 0 ? x : "").trim().toLowerCase())
        .join("|");
}
/**
 * Discover and classify every actionable field across the page and its frames.
 */
async function scanFields(root) {
    const pages = [root, ...root.frames()];
    const fields = [];
    for (const page of pages) {
        let controls;
        try {
            controls = await page.queryAll(CONTROL_SELECTOR);
        }
        catch {
            continue; // Cross-origin frame or detached; skip gracefully.
        }
        for (const el of controls) {
            const described = await describeControl(el);
            if (described)
                fields.push(described);
        }
    }
    return fields;
}
