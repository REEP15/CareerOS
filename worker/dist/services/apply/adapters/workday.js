"use strict";
/**
 * Workday adapter
 * Mirrors v0_phase3/adapters/sites/workday.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkdayAdapter = void 0;
const base_adapter_1 = require("./base-adapter");
const collector_1 = require("@/types/collector");
class WorkdayAdapter extends base_adapter_1.BaseAdapter {
    constructor() {
        super(...arguments);
        this.id = "workday";
        this.displayName = "Workday";
        this.mode = collector_1.AutomationMode.FULL_AUTOMATION;
        this.hostPatterns = ["workday.com", "myworkdayjobs.com"];
        this.domSignatures = [
            "[data-automation-id='applicationForm']",
            ".application-form",
            "[class*='workday']",
        ];
    }
    async openApplicationForm(page, _ctx, hooks) {
        var _a;
        const apply = (_a = (await page.query("button:has-text('Apply')").catch(() => null))) !== null && _a !== void 0 ? _a : (await page.query("[data-automation-id='applyButton']").catch(() => null));
        if (apply && (await apply.isVisible()) && (await apply.isEnabled())) {
            hooks.log("info", "Workday: opening application form");
            await apply.click();
            await page.waitForLoadState("networkidle").catch(() => { });
        }
        return page;
    }
    async fieldHints(_formPage) {
        return [
            this.hint("input[data-automation-id='firstName']", "first_name"),
            this.hint("input[data-automation-id='lastName']", "last_name"),
            this.hint("input[data-automation-id='email']", "email"),
            this.hint("input[data-automation-id='phone']", "phone"),
            this.hint("input[type='file']", "resume_upload"),
        ];
    }
}
exports.WorkdayAdapter = WorkdayAdapter;
