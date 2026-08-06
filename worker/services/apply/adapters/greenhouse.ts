/**
 * Greenhouse adapter
 * Mirrors v0_phase3/adapters/sites/greenhouse.ts
 */

import type { BrowserPage } from "../../../../shared/types/browser";
import type { AutomationRunContext, EngineHooks } from "../engine/context";
import { BaseAdapter } from "./base-adapter";
import type { AdapterFieldHint } from "./base";
import { AutomationMode } from "../../../../shared/types/collector";

export class GreenhouseAdapter extends BaseAdapter {
  readonly id = "greenhouse";
  readonly displayName = "Greenhouse";
  readonly mode = AutomationMode.FULL_AUTOMATION;
  protected readonly hostPatterns = ["greenhouse.io", "boards.greenhouse.io"];
  protected readonly domSignatures = [
    "[data-test='application-form']",
    ".application-form",
    "[class*='greenhouse']",
  ];

  async openApplicationForm(
    page: BrowserPage,
    _ctx: AutomationRunContext,
    hooks: EngineHooks,
  ): Promise<BrowserPage> {
    const apply =
      (await page.query("button:has-text('Apply for this job')").catch(() => null)) ??
      (await page.query("[data-test='apply-button']").catch(() => null));
    if (apply && (await apply.isVisible()) && (await apply.isEnabled())) {
      hooks.log("info", "Greenhouse: opening application form");
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
      this.hint("input[name='location']", "address_line"),
      this.hint("input[type='file']", "resume_upload"),
    ];
  }
}