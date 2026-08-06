"use strict";
/**
 * Workable adapter
 * Mirrors v0_phase3/adapters/sites/workable.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkableAdapter = void 0;
const base_adapter_1 = require("./base-adapter");
const collector_1 = require("@/types/collector");
class WorkableAdapter extends base_adapter_1.BaseAdapter {
    constructor() {
        super(...arguments);
        this.id = "workable";
        this.displayName = "Workable";
        this.mode = collector_1.AutomationMode.FULL_AUTOMATION;
        this.hostPatterns = ["workable.com", "jobs.workable.com"];
        this.domSignatures = [
            "[data-test='application-form']",
            ".application-form",
            "[class*='workable']",
        ];
    }
    async openApplicationForm(page, _ctx, hooks) {
        var _a;
        const apply = (_a = (await page.query("button:has-text('Apply')").catch(() => null))) !== null && _a !== void 0 ? _a : (await page.query("[data-test='apply-button']").catch(() => null));
        if (apply && (await apply.isVisible()) && (await apply.isEnabled())) {
            hooks.log("info", "Workable: opening application form");
            await apply.click();
            await page.waitForLoadState("networkidle").catch(() => { });
        }
        return page;
    }
    async fieldHints(_formPage) {
        return [
            this.hint("input[name='candidate[name]']", "full_name"),
            this.hint("input[name='candidate[email]']", "email"),
            this.hint("input[name='candidate[phone]']", "phone"),
            this.hint("input[type='file']", "resume_upload"),
        ];
    }
}
exports.WorkableAdapter = WorkableAdapter;
