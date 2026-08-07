"use strict";
/**
 * BaseAdapter — shared scaffolding for site adapters
 * Mirrors v0_phase3/adapters/base-adapter.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseAdapter = void 0;
class BaseAdapter {
    constructor() {
        /**
         * Optional CSS signature proving we're on an application/job page (not just
         * the domain). Matches if ANY selector resolves. Leave empty to match on host
         * alone.
         */
        this.domSignatures = [];
    }
    async matches(page) {
        const host = safeHost(page.url());
        const hostOk = this.hostPatterns.some((h) => host.includes(h));
        if (!hostOk)
            return false;
        if (this.domSignatures.length === 0)
            return true;
        for (const sel of this.domSignatures) {
            const el = await page.query(sel).catch(() => null);
            if (el)
                return true;
        }
        return false;
    }
    /**
     * Default navigation: click a visible "Apply"/"Easy Apply" control if the
     * form isn't already open, then wait for the network to settle. Adapters with
     * modal/iframe flows override this.
     */
    async openApplicationForm(page, _ctx, hooks) {
        const apply = await findApplyControl(page);
        if (apply && (await apply.isEnabled())) {
            hooks.log("info", `${this.displayName}: clicking apply control`);
            await apply.click();
            await page.waitForLoadState("networkidle").catch(() => { });
        }
        return page;
    }
    /** Adapters override to hint controls they recognize with high confidence. */
    async fieldHints(_formPage) {
        return [];
    }
    /**
     * Default multi-step advancement via the shared text finder. Never clicks a
     * final submit (that regex is disjoint from the submit regex).
     */
    async advanceStep(formPage, _ctx, hooks) {
        const next = await findAdvanceControl(formPage);
        if (!next || !(await next.isEnabled()))
            return { advanced: false };
        hooks.log("debug", `${this.displayName}: advancing to next step`);
        await next.click();
        await formPage.waitForLoadState("networkidle").catch(() => { });
        return { advanced: true };
    }
    locateSubmit(formPage) {
        return findSubmitControl(formPage);
    }
    /** Small helper so subclasses can express hints declaratively. */
    hint(selector, semantic) {
        return { selector, semantic };
    }
}
exports.BaseAdapter = BaseAdapter;
function safeHost(url) {
    try {
        return new URL(url).host.toLowerCase();
    }
    catch {
        return "";
    }
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
/** Find a control that advances to the next step (not submit) */
async function findAdvanceControl(page) {
    const selectors = [
        "button:has-text('Next')",
        "button:has-text('Continue')",
        "button:has-text('Save and Continue')",
        "[data-testid='next']",
        "[data-testid='continue']",
        ".next-button",
        "#next-button",
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
        "[data-testid='submit']",
        "[data-testid='submit-application']",
        ".submit-button",
        "#submit-button",
        "button[type='submit']",
    ];
    for (const selector of selectors) {
        const el = await page.query(selector).catch(() => null);
        if (el && (await el.isVisible()))
            return el;
    }
    return null;
}
