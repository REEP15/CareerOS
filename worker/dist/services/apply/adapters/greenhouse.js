"use strict";
/**
 * Greenhouse adapter
 * Mirrors v0_phase3/adapters/sites/greenhouse.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GreenhouseAdapter = void 0;
const base_adapter_1 = require("./base-adapter");
const collector_1 = require("@/types/collector");
class GreenhouseAdapter extends base_adapter_1.BaseAdapter {
    constructor() {
        super(...arguments);
        this.id = "greenhouse";
        this.displayName = "Greenhouse";
        this.mode = collector_1.AutomationMode.FULL_AUTOMATION;
        this.hostPatterns = ["greenhouse.io", "boards.greenhouse.io"];
        this.domSignatures = [
            "[data-test='application-form']",
            ".application-form",
            "[class*='greenhouse']",
        ];
    }
    async openApplicationForm(page, _ctx, hooks) {
        var _a;
        const apply = (_a = (await page.query("button:has-text('Apply for this job')").catch(() => null))) !== null && _a !== void 0 ? _a : (await page.query("[data-test='apply-button']").catch(() => null));
        if (apply && (await apply.isVisible()) && (await apply.isEnabled())) {
            hooks.log("info", "Greenhouse: opening application form");
            await apply.click();
            await page.waitForLoadState("networkidle").catch(() => { });
        }
        return page;
    }
    async fieldHints(_formPage) {
        return [
            this.hint("input[name='first_name']", "first_name"),
            this.hint("input[name='last_name']", "last_name"),
            this.hint("input[name='email']", "email"),
            this.hint("input[name='phone']", "phone"),
            this.hint("input[name='location']", "address_line"),
            this.hint("input[type='file']", "resume_upload"),
        ];
    }
}
exports.GreenhouseAdapter = GreenhouseAdapter;
