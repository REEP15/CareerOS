"use strict";
/**
 * Wellfound (formerly AngelList) adapter
 * Mirrors v0_phase3/adapters/sites/wellfound.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WellfoundAdapter = void 0;
const base_adapter_1 = require("./base-adapter");
const collector_1 = require("@/types/collector");
class WellfoundAdapter extends base_adapter_1.BaseAdapter {
    constructor() {
        super(...arguments);
        this.id = "wellfound";
        this.displayName = "Wellfound";
        this.mode = collector_1.AutomationMode.FULL_AUTOMATION;
        this.hostPatterns = ["wellfound.com", "angel.co"];
        this.domSignatures = [
            "[data-test='apply-form']",
            ".apply-form",
            "[class*='wellfound']",
            "[class*='angel']",
        ];
    }
    async openApplicationForm(page, _ctx, hooks) {
        var _a;
        const apply = (_a = (await page.query("button:has-text('Apply')").catch(() => null))) !== null && _a !== void 0 ? _a : (await page.query("[data-test='apply-button']").catch(() => null));
        if (apply && (await apply.isVisible()) && (await apply.isEnabled())) {
            hooks.log("info", "Wellfound: opening application form");
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
            this.hint("input[type='file']", "resume_upload"),
        ];
    }
}
exports.WellfoundAdapter = WellfoundAdapter;
