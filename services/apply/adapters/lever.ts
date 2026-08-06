/**
 * Lever adapter
 * Mirrors v0_phase3/adapters/sites/lever.ts
 */

import type { BrowserPage } from "@/types/browser";
import type { AutomationRunContext, EngineHooks } from "../engine/context";
import { BaseAdapter } from "./base-adapter";
import type { AdapterFieldHint } from "./base";

export class LeverAdapter extends BaseAdapter {
  readonly id = "lever";
  readonly displayName = "Lever";
  protected readonly hostPatterns = ["lever.co", "jobs.lever.co"];
  protected readonly domSignatures = [
    "[data-qa='apply-form']",
    ".apply-form",
    "[class*='lever']",
  ];

  async openApplicationForm(
    page: BrowserPage,
    _ctx: AutomationRunContext,
    hooks: EngineHooks,
  ): Promise<BrowserPage> {
    const apply =
      (await page.query("button:has-text('Apply for this job')").catch(() => null)) ??
      (await page.query("[data-qa='apply-button']").catch(() => null));
    if (apply && (await apply.isVisible()) && (await apply.isEnabled())) {
      hooks.log("info", "Lever: opening application form");
      await apply.click();
      await page.waitForLoadState("networkidle").catch(() => {});
    }
    return page;
  }

  async fieldHints(_formPage: BrowserPage): Promise<AdapterFieldHint[]> {
    return [
      this.hint("input[name='name']", "full_name"),
      this.hint("input[name='email']", "email"),
      this.hint("input[name='phone']", "phone"),
      this.hint("input[name='org']", "current_company"),
      this.hint("input[name='headshot']", "resume_upload"),
    ];
  }
}