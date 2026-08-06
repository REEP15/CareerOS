/**
 * Workday adapter
 * Mirrors v0_phase3/adapters/sites/workday.ts
 */

import type { BrowserPage } from "../../../../shared/types/browser";
import type { AutomationRunContext, EngineHooks } from "../engine/context";
import { BaseAdapter } from "./base-adapter";
import type { AdapterFieldHint } from "./base";
import { AutomationMode } from "../../../../shared/types/collector";

export class WorkdayAdapter extends BaseAdapter {
  readonly id = "workday";
  readonly displayName = "Workday";
  readonly mode = AutomationMode.FULL_AUTOMATION;
  protected readonly hostPatterns = ["workday.com", "myworkdayjobs.com"];
  protected readonly domSignatures = [
    "[data-automation-id='applicationForm']",
    ".application-form",
    "[class*='workday']",
  ];

  async openApplicationForm(
    page: BrowserPage,
    _ctx: AutomationRunContext,
    hooks: EngineHooks,
  ): Promise<BrowserPage> {
    const apply =
      (await page.query("button:has-text('Apply')").catch(() => null)) ??
      (await page.query("[data-automation-id='applyButton']").catch(() => null));
    if (apply && (await apply.isVisible()) && (await apply.isEnabled())) {
      hooks.log("info", "Workday: opening application form");
      await apply.click();
      await page.waitForLoadState("networkidle").catch(() => {});
    }
    return page;
  }

  async fieldHints(_formPage: BrowserPage): Promise<AdapterFieldHint[]> {
    return [
      this.hint("input[data-automation-id='firstName']", "first_name"),
      this.hint("input[data-automation-id='lastName']", "last_name"),
      this.hint("input[data-automation-id='email']", "email"),
      this.hint("input[data-automation-id='phone']", "phone"),
      this.hint("input[type='file']", "resume_upload"),
    ];
  }
}