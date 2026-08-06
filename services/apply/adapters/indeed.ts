/**
 * Indeed adapter
 * Mirrors v0_phase3/adapters/sites/indeed.ts
 */

import type { BrowserPage } from "@/types/browser";
import type { AutomationRunContext, EngineHooks } from "../engine/context";
import { BaseAdapter } from "./base-adapter";
import type { AdapterFieldHint } from "./base";
import { AutomationMode } from "@/types/collector";

export class IndeedAdapter extends BaseAdapter {
  readonly id = "indeed";
  readonly displayName = "Indeed";
  readonly mode = AutomationMode.FULL_AUTOMATION;
  protected readonly hostPatterns = ["indeed.com", "smartapply.indeed.com"];
  protected readonly domSignatures = [
    "#indeedApplyButton",
    "[data-testid='indeedApplyButton']",
    ".ia-container",
  ];

  async openApplicationForm(
    page: BrowserPage,
    _ctx: AutomationRunContext,
    hooks: EngineHooks,
  ): Promise<BrowserPage> {
    const apply =
      (await page.query("#indeedApplyButton button").catch(() => null)) ??
      (await page.query("[data-testid='indeedApplyButton']").catch(() => null));
    if (apply && (await apply.isVisible())) {
      hooks.log("info", "Indeed: entering Indeed Apply flow");
      await apply.click();
      await page.waitForLoadState("networkidle").catch(() => {});
    }
    return page;
  }

  async fieldHints(_formPage: BrowserPage): Promise<AdapterFieldHint[]> {
    return [
      this.hint("#input-applicant\\.name", "full_name"),
      this.hint("#input-applicant\\.email", "email"),
      this.hint("#input-applicant\\.phoneNumber", "phone"),
      this.hint("input[type='file']", "resume_upload"),
    ];
  }
}