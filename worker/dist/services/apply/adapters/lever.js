"use strict";
/**
 * Lever adapter
 * Mirrors v0_phase3/adapters/sites/lever.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeverAdapter = void 0;
const base_adapter_1 = require("./base-adapter");
const collector_1 = require("@/types/collector");
class LeverAdapter extends base_adapter_1.BaseAdapter {
    constructor() {
        super(...arguments);
        this.id = "lever";
        this.displayName = "Lever";
        this.mode = collector_1.AutomationMode.FULL_AUTOMATION;
        this.hostPatterns = ["lever.co", "jobs.lever.co"];
        this.domSignatures = [
            "[data-qa='apply-form']",
            ".apply-form",
            "[class*='lever']",
        ];
    }
    async openApplicationForm(page, _ctx, hooks) {
        var _a;
        const apply = (_a = (await page.query("button:has-text('Apply for this job')").catch(() => null))) !== null && _a !== void 0 ? _a : (await page.query("[data-qa='apply-button']").catch(() => null));
        if (apply && (await apply.isVisible()) && (await apply.isEnabled())) {
            hooks.log("info", "Lever: opening application form");
            await apply.click();
            await page.waitForLoadState("networkidle").catch(() => { });
        }
        return page;
    }
    async fieldHints(_formPage) {
        return [
            this.hint("input[name='name']", "full_name"),
            this.hint("input[name='email']", "email"),
            this.hint("input[name='phone']", "phone"),
            this.hint("input[name='org']", "current_company"),
            this.hint("input[name='headshot']", "resume_upload"),
        ];
    }
}
exports.LeverAdapter = LeverAdapter;
