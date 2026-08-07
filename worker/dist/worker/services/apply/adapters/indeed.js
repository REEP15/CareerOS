"use strict";
/**
 * Indeed adapter
 * Mirrors v0_phase3/adapters/sites/indeed.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.IndeedAdapter = void 0;
const base_adapter_1 = require("./base-adapter");
const collector_1 = require("@/types/collector");
class IndeedAdapter extends base_adapter_1.BaseAdapter {
    constructor() {
        super(...arguments);
        this.id = "indeed";
        this.displayName = "Indeed";
        this.mode = collector_1.AutomationMode.FULL_AUTOMATION;
        this.hostPatterns = ["indeed.com", "smartapply.indeed.com"];
        this.domSignatures = [
            "#indeedApplyButton",
            "[data-testid='indeedApplyButton']",
            ".ia-container",
        ];
    }
    async openApplicationForm(page, _ctx, hooks) {
        var _a;
        const apply = (_a = (await page.query("#indeedApplyButton button").catch(() => null))) !== null && _a !== void 0 ? _a : (await page.query("[data-testid='indeedApplyButton']").catch(() => null));
        if (apply && (await apply.isVisible())) {
            hooks.log("info", "Indeed: entering Indeed Apply flow");
            await apply.click();
            await page.waitForLoadState("networkidle").catch(() => { });
        }
        return page;
    }
    async fieldHints(_formPage) {
        return [
            this.hint("#input-applicant\\.name", "full_name"),
            this.hint("#input-applicant\\.email", "email"),
            this.hint("#input-applicant\\.phoneNumber", "phone"),
            this.hint("input[type='file']", "resume_upload"),
        ];
    }
}
exports.IndeedAdapter = IndeedAdapter;
