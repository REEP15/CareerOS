/**
 * Naukri.com adapter
 * Mirrors v0_phase3/adapters/sites/naukri.ts
 */

import type { BrowserPage } from "@/types/browser";
import type { AutomationRunContext, EngineHooks } from "../engine/context";
import { BaseAdapter } from "./base-adapter";
import type { AdapterFieldHint } from "./base";
import { AutomationMode } from "@/types/collector";

export class NaukriAdapter extends BaseAdapter {
  readonly id = "naukri";
  readonly displayName = "Naukri";
  readonly mode = AutomationMode.FULL_AUTOMATION;
  protected readonly hostPatterns = ["naukri.com"];
  protected readonly domSignatures = [
    "#apply-button",
    "button.apply-button",
    "[class*='styles_apply']",
  ];

  async openApplicationForm(
    page: BrowserPage,
    _ctx: AutomationRunContext,
    hooks: EngineHooks,
  ): Promise<BrowserPage> {
    const apply =
      (await page.query("#apply-button").catch(() => null)) ??
      (await page.query("button.apply-button").catch(() => null));
    if (apply && (await apply.isVisible()) && (await apply.isEnabled())) {
      hooks.log("info", "Naukri: opening apply drawer");
      await apply.click();
      // The custom-questions chatbot renders asynchronously in a drawer.
      await page
        .waitForSelector("[class*='chatbot'], .chatbot_Drawer", { timeout: 8000 })
        .catch(() => {});
    }
    return page;
  }

  async fieldHints(_formPage: BrowserPage): Promise<AdapterFieldHint[]> {
    // Naukri renders custom questions with generic inputs; the generic
    // classifier handles them well. Only the resume-headline textarea is worth
    // hinting explicitly.
    return [this.hint("textarea[name='resumeHeadline']", "unknown")];
  }
}