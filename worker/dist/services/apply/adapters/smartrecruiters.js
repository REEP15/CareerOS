"use strict";
/**
 * SmartRecruiters adapter
 * Replaces iCIMS adapter per requirements
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmartRecruitersAdapter = void 0;
const base_adapter_1 = require("./base-adapter");
const collector_1 = require("@/types/collector");
class SmartRecruitersAdapter extends base_adapter_1.BaseAdapter {
    constructor() {
        super(...arguments);
        this.id = "smartrecruiters";
        this.displayName = "SmartRecruiters";
        this.mode = collector_1.AutomationMode.FULL_AUTOMATION;
        this.hostPatterns = ["smartrecruiters.com", "jobs.smartrecruiters.com"];
        this.domSignatures = [
            "[data-test='apply-form']",
            ".sr-apply-form",
            "[class*='smartrecruiters']",
        ];
    }
    async openApplicationForm(page, _ctx, hooks) {
        var _a;
        const apply = (_a = (await page.query("button:has-text('Apply')").catch(() => null))) !== null && _a !== void 0 ? _a : (await page.query("[data-test='apply-button']").catch(() => null));
        if (apply && (await apply.isVisible()) && (await apply.isEnabled())) {
            hooks.log("info", "SmartRecruiters: opening application form");
            await apply.click();
            await page.waitForLoadState("networkidle").catch(() => { });
        }
        return page;
    }
    async fieldHints(_formPage) {
        return [
            this.hint("input[name='candidate.firstName']", "first_name"),
            this.hint("input[name='candidate.lastName']", "last_name"),
            this.hint("input[name='candidate.email']", "email"),
            this.hint("input[name='candidate.phone']", "phone"),
            this.hint("input[type='file']", "resume_upload"),
        ];
    }
}
exports.SmartRecruitersAdapter = SmartRecruitersAdapter;
