"use strict";
/**
 * Naukri.com adapter
 * Mirrors v0_phase3/adapters/sites/naukri.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NaukriAdapter = void 0;
const base_adapter_1 = require("./base-adapter");
const collector_1 = require("@/types/collector");
class NaukriAdapter extends base_adapter_1.BaseAdapter {
    constructor() {
        super(...arguments);
        this.id = "naukri";
        this.displayName = "Naukri";
        this.mode = collector_1.AutomationMode.FULL_AUTOMATION;
        this.hostPatterns = ["naukri.com"];
        this.domSignatures = [
            "#apply-button",
            "button.apply-button",
            "[class*='styles_apply']",
        ];
    }
    async openApplicationForm(page, _ctx, hooks) {
        var _a;
        const apply = (_a = (await page.query("#apply-button").catch(() => null))) !== null && _a !== void 0 ? _a : (await page.query("button.apply-button").catch(() => null));
        if (apply && (await apply.isVisible()) && (await apply.isEnabled())) {
            hooks.log("info", "Naukri: opening apply drawer");
            await apply.click();
            // The custom-questions chatbot renders asynchronously in a drawer.
            await page
                .waitForSelector("[class*='chatbot'], .chatbot_Drawer", { timeout: 8000 })
                .catch(() => { });
        }
        return page;
    }
    async fieldHints(_formPage) {
        // Naukri renders custom questions with generic inputs; the generic
        // classifier handles them well. Only the resume-headline textarea is worth
        // hinting explicitly.
        return [this.hint("textarea[name='resumeHeadline']", "unknown")];
    }
}
exports.NaukriAdapter = NaukriAdapter;
