/**
 * Ashby adapter
 * Mirrors v0_phase3/adapters/sites/ashby.ts
 */

import type { BrowserPage } from "../../../../../shared/types/browser";
import type { AutomationRunContext, EngineHooks } from "../engine/context";
import { BaseAdapter } from "./base-adapter";
import type { AdapterFieldHint } from "./base";
import { AutomationMode } from "../../../../shared/types/collector";

export class AshbyAdapter extends BaseAdapter {
  readonly id = "ashby";
  readonly displayName = "Ashby";
  readonly mode = AutomationMode.FULL_AUTOMATION;
  protected readonly hostPatterns = ["ashbyhq.com", "jobs.ashbyhq.com"];
  protected readonly domSignatures = [
    "[data-test='application-form']",
    ".application-form",
    "[class*='ashby']",
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
      hooks.log("info", "Ashby: opening application form");
      await apply.click();
      await page.waitForLoadState("networkidle").catch(() => {});
    }
    return page;
  }

  async fieldHints(_formPage: BrowserPage): Promise<AdapterFieldHint[]> {
    return [
      this.hint("input[name='first_name']", "first_name"),
      this.hint("input[name='last_name']", "last_name"),
      this.hint("input[name='email']", "email"),
      this.hint("input[name='phone']", "phone"),
      this.hint("input[type='file']", "resume_upload"),
    ];
  }
}