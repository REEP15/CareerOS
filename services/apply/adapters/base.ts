/**
 * Base adapter interface and registry
 * Mirrors v0_phase3/adapters/base-adapter.ts and adapter-registry.ts
 */

import type { BrowserPage, BrowserElement } from "@/types/browser";
import type { FieldSemantic } from "@/types/automation";
import type { AutomationRunContext, EngineHooks } from "../engine/context";

export interface AdapterFieldHint {
  selector: string;
  semantic: FieldSemantic;
}

export interface SiteAdapter {
  readonly id: string;
  readonly displayName: string;

  /** Returns true if this adapter can handle the current page */
  matches(page: BrowserPage): Promise<boolean>;

  /** Navigate to and open the application form, returning the page that contains it */
  openApplicationForm(page: BrowserPage, ctx: AutomationRunContext, hooks: EngineHooks): Promise<BrowserPage>;

  /** Optional: return field hints for controls this adapter recognizes with high confidence */
  fieldHints?(formPage: BrowserPage): Promise<AdapterFieldHint[]>;

  /** Optional: advance to the next step in a multi-step form */
  advanceStep?(formPage: BrowserPage, ctx: AutomationRunContext, hooks: EngineHooks): Promise<{ advanced: boolean }>;

  /** Locate the submit button on the final form page */
  locateSubmit(formPage: BrowserPage): Promise<BrowserElement | null>;
}

export interface SiteAdapter {
  readonly id: string;
  readonly displayName: string;

  /** Returns true if this adapter can handle the current page */
  matches(page: BrowserPage): Promise<boolean>;

  /** Navigate to and open the application form, returning the page that contains it */
  openApplicationForm(page: BrowserPage, ctx: AutomationRunContext, hooks: EngineHooks): Promise<BrowserPage>;

  /** Optional: return field hints for controls this adapter recognizes with high confidence */
  fieldHints?(formPage: BrowserPage): Promise<AdapterFieldHint[]>;

  /** Optional: advance to the next step in a multi-step form */
  advanceStep?(formPage: BrowserPage, ctx: AutomationRunContext, hooks: EngineHooks): Promise<{ advanced: boolean }>;

  /** Locate the submit button on the final form page */
  locateSubmit(formPage: BrowserPage): Promise<BrowserElement | null>;
}

export class AdapterRegistry {
  private readonly adapters: SiteAdapter[] = [];

  register(adapter: SiteAdapter): this {
    if (this.adapters.some((a) => a.id === adapter.id)) {
      throw new Error(`Adapter "${adapter.id}" is already registered`);
    }
    this.adapters.push(adapter);
    return this;
  }

  registerAll(adapters: SiteAdapter[]): this {
    adapters.forEach((a) => this.register(a));
    return this;
  }

  list(): readonly SiteAdapter[] {
    return this.adapters;
  }

  getAdapters(): SiteAdapter[] {
    return this.adapters;
  }

  /** First adapter whose `matches` returns true, or null for generic fallback. */
  async detect(page: BrowserPage): Promise<SiteAdapter | null> {
    for (const adapter of this.adapters) {
      try {
        if (await adapter.matches(page)) return adapter;
      } catch {
        // A misbehaving detector must never break detection for the rest.
      }
    }
    return null;
  }
}