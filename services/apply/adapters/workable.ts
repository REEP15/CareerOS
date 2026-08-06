/**
 * Workable adapter
 * Mirrors v0_phase3/adapters/sites/workable.ts
 */

import type { BrowserPage } from "@/types/browser";
import type { AutomationRunContext, EngineHooks } from "../engine/context";
import { BaseAdapter } from "./base-adapter";
import type { AdapterFieldHint } from "./base";

export class WorkableAdapter extends BaseAdapter {
  readonly id = "workable";
  readonly displayName = "Workable";
  protected readonly hostPatterns = ["workable.com", "jobs.workable.com"];
  protected readonly domSignatures = [
    "[data-test='application-form']",
    ".application-form",
    "[class*='workable']",
  ];

  async openApplicationForm(
    page: BrowserPage,
    _ctx: AutomationRunContext,
    hooks: EngineHooks,
  ): Promise<BrowserPage> {
    const apply =
      (await page.query("button:has-text('Apply')").catch(() => null)) ??
      (await page.query("[data-test='apply-button']").catch(() => null));
    if (apply && (await apply.isVisible()) && (await apply.isEnabled())) {
      hooks.log("info", "Workable: opening application form");
      await apply.click();
      await page.waitForLoadState("networkidle").catch(() => {});
    }
    return page;
  }

  async fieldHints(_formPage: BrowserPage): Promise<AdapterFieldHint[]> {
    return [
      this.hint("input[name='candidate[name]']", "full_name"),
      this.hint("input[name='candidate[email]']", "email"),
      this.hint("input[name='candidate[phone]']", "phone"),
      this.hint("input[type='file']", "resume_upload"),
    ];
  }
}