/**
 * SmartRecruiters adapter
 * Replaces iCIMS adapter per requirements
 */

import type { BrowserPage } from "../../../../shared/types/browser";
import type { AutomationRunContext, EngineHooks } from "../engine/context";
import { BaseAdapter } from "./base-adapter";
import type { AdapterFieldHint } from "./base";
import { AutomationMode } from "../../../../shared/types/collector";

export class SmartRecruitersAdapter extends BaseAdapter {
  readonly id = "smartrecruiters";
  readonly displayName = "SmartRecruiters";
  readonly mode = AutomationMode.FULL_AUTOMATION;
  protected readonly hostPatterns = ["smartrecruiters.com", "jobs.smartrecruiters.com"];
  protected readonly domSignatures = [
    "[data-test='apply-form']",
    ".sr-apply-form",
    "[class*='smartrecruiters']",
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
      hooks.log("info", "SmartRecruiters: opening application form");
      await apply.click();
      await page.waitForLoadState("networkidle").catch(() => {});
    }
    return page;
  }

  async fieldHints(_formPage: BrowserPage): Promise<AdapterFieldHint[]> {
    return [
      this.hint("input[name='candidate.firstName']", "first_name"),
      this.hint("input[name='candidate.lastName']", "last_name"),
      this.hint("input[name='candidate.email']", "email"),
      this.hint("input[name='candidate.phone']", "phone"),
      this.hint("input[type='file']", "resume_upload"),
    ];
  }
}