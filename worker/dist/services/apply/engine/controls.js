"use strict";
/**
 * Control finding helpers - shared between adapters and engine
 * Mirrors v0_phase3/engine/controls.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.findAdvanceControl = findAdvanceControl;
exports.findSubmitControl = findSubmitControl;
exports.findApplyControl = findApplyControl;
/** Find a control that advances to the next step (not submit) */
async function findAdvanceControl(page) {
    const selectors = [
        "button:has-text('Next')",
        "button:has-text('Continue')",
        "button:has-text('Save and Continue')",
        "button:has-text('Save & Continue')",
        "[data-testid='next']",
        "[data-testid='continue']",
        ".next-button",
        "#next-button",
        "[aria-label*='next' i]",
        "[aria-label*='continue' i]",
    ];
    for (const selector of selectors) {
        const el = await page.query(selector).catch(() => null);
        if (el && (await el.isVisible()))
            return el;
    }
    return null;
}
/** Find the submit button on the final form */
async function findSubmitControl(page) {
    const selectors = [
        "button:has-text('Submit')",
        "button:has-text('Submit Application')",
        "button:has-text('Send Application')",
        "button:has-text('Apply')",
        "[data-testid='submit']",
        "[data-testid='submit-application']",
        ".submit-button",
        "#submit-button",
        "button[type='submit']",
        "[aria-label*='submit' i]",
    ];
    for (const selector of selectors) {
        const el = await page.query(selector).catch(() => null);
        if (el && (await el.isVisible()))
            return el;
    }
    return null;
}
/** Find a control that looks like an "Apply" button */
async function findApplyControl(page) {
    const selectors = [
        "button:has-text('Apply')",
        "button:has-text('Easy Apply')",
        "a:has-text('Apply')",
        "[data-testid='apply']",
        "[data-testid='easy-apply']",
        ".apply-button",
        "#apply-button",
    ];
    for (const selector of selectors) {
        const el = await page.query(selector).catch(() => null);
        if (el && (await el.isVisible()))
            return el;
    }
    return null;
}
