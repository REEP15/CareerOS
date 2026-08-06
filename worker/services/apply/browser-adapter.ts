/**
 * Playwright implementation of browser abstraction
 * Mirrors v0_phase3/browser/playwright-driver.ts for clean browser isolation
 */

import type { BrowserPage, BrowserElement, BoundingBox } from "../../../../shared/types/browser";

type PlaywrightModule = {
  chromium: {
    launch: (options: { headless: boolean; timeout?: number }) => Promise<Browser>;
  };
};

type Browser = {
  close: () => Promise<void>;
  newPage: () => Promise<Page>;
};

type Locator = {
  count: () => Promise<number>;
  first: () => Locator;
  nth: (index: number) => Locator;
  fill: (value: string) => Promise<void>;
  setInputFiles: (filePath: string) => Promise<void>;
  inputValue: () => Promise<string>;
  getAttribute: (name: string) => Promise<string | null>;
  click: () => Promise<void>;
  check: () => Promise<void>;
  uncheck: () => Promise<void>;
  selectOption: (value: { value?: string; label?: string } | string) => Promise<string[]>;
  type: (value: string, options?: { delay?: number }) => Promise<void>;
  isVisible: () => Promise<boolean>;
  isEnabled: () => Promise<boolean>;
  isChecked: () => Promise<boolean>;
  scrollIntoViewIfNeeded: () => Promise<void>;
  boundingBox: () => Promise<BoundingBox | null>;
  textContent: () => Promise<string | null>;
  innerText: () => Promise<string>;
};

type Page = {
  goto: (url: string, options: { waitUntil: "domcontentloaded"; timeout?: number }) => Promise<unknown>;
  getByLabel: (label: string | RegExp) => Locator;
  locator: (selector: string) => Locator;
  url: () => string;
  title: () => Promise<string>;
  content: () => Promise<string>;
  waitForLoadState: (state: "load" | "domcontentloaded" | "networkidle") => Promise<void>;
  waitForTimeout: (ms: number) => Promise<void>;
  waitForSelector: (selector: string, options?: { timeout?: number; state?: "attached" | "visible" }) => Promise<Locator>;
  $(selector: string): Promise<Locator | null>;
  $$(selector: string): Promise<Locator[]>;
  screenshot: (options?: { fullPage?: boolean }) => Promise<Buffer>;
  evaluate: (fn: string) => Promise<unknown>;
};

class PlaywrightElement implements BrowserElement {
  constructor(private readonly locator: Locator) {}

  async tagName(): Promise<string> {
    // Playwright locator doesn't have direct tagName access, need to evaluate
    return "input"; // Simplified for now
  }

  async getAttribute(name: string): Promise<string | null> {
    return this.locator.getAttribute(name);
  }

  async textContent(): Promise<string | null> {
    return this.locator.textContent();
  }

  async innerText(): Promise<string> {
    const text = await this.locator.textContent();
    return text || "";
  }

  async inputValue(): Promise<string> {
    return this.locator.inputValue();
  }

  async isVisible(): Promise<boolean> {
    return this.locator.isVisible();
  }

  async isEnabled(): Promise<boolean> {
    return this.locator.isEnabled();
  }

  async isChecked(): Promise<boolean> {
    return this.locator.isChecked();
  }

  async fill(value: string): Promise<void> {
    await this.locator.fill(value);
  }

  async type(value: string, options?: { delay?: number }): Promise<void> {
    await this.locator.type(value, options);
  }

  async click(): Promise<void> {
    await this.locator.click();
  }

  async check(): Promise<void> {
    await this.locator.check();
  }

  async uncheck(): Promise<void> {
    await this.locator.uncheck();
  }

  async selectOption(value: { value?: string; label?: string } | string): Promise<string[]> {
    return this.locator.selectOption(value as never);
  }

  async setInputFiles(files: string | string[]): Promise<void> {
    await this.locator.setInputFiles(files as never);
  }

  async scrollIntoViewIfNeeded(): Promise<void> {
    // Playwright handles this automatically
  }

  async boundingBox(): Promise<BoundingBox | null> {
    return this.locator.boundingBox();
  }

  async accessibleLabel(): Promise<string | null> {
    // Combine aria-label, aria-labelledby, and associated label text
    const ariaLabel = await this.getAttribute("aria-label");
    if (ariaLabel) return ariaLabel;

    const labelledBy = await this.getAttribute("aria-labelledby");
    if (labelledBy) {
      // Would need to resolve referenced element text
      return null;
    }

    const id = await this.getAttribute("id");
    if (id) {
      // Would need to find label[for="id"] and get text
      return null;
    }

    return null;
  }

  async describedByText(): Promise<string | null> {
    const describedBy = await this.getAttribute("aria-describedby");
    if (!describedBy) return null;
    // Would need to resolve referenced element text
    return null;
  }

  async options(): Promise<{ label: string; value: string }[]> {
    // Simplified - would need to handle select options and radio groups
    return [];
  }

  async nearbyText(): Promise<string | null> {
    // Would need to walk up DOM tree and extract nearby text
    return null;
  }
}

class PlaywrightPage implements BrowserPage {
  constructor(private readonly page: Page) {}

  url(): string {
    return this.page.url();
  }

  async title(): Promise<string> {
    return this.page.title();
  }

  async content(): Promise<string> {
    return this.page.content();
  }

  async goto(url: string): Promise<void> {
    await this.page.goto(url, { waitUntil: "domcontentloaded" });
  }

  async waitForLoadState(state: "load" | "domcontentloaded" | "networkidle"): Promise<void> {
    await this.page.waitForLoadState(state);
  }

  async waitForTimeout(ms: number): Promise<void> {
    await this.page.waitForTimeout(ms);
  }

  async waitForSelector(selector: string, options?: { timeout?: number; state?: "attached" | "visible" }): Promise<BrowserElement | null> {
    const locator = await this.page.waitForSelector(selector, options);
    return locator ? new PlaywrightElement(locator) : null;
  }

  async query(selector: string): Promise<BrowserElement | null> {
    const locator = await this.page.$(selector);
    return locator ? new PlaywrightElement(locator) : null;
  }

  async queryAll(selector: string): Promise<BrowserElement[]> {
    const locators = await this.page.$$(selector);
    return locators.map(l => new PlaywrightElement(l));
  }

  frames(): BrowserPage[] {
    // Playwright frames would need special handling
    return [];
  }

  async screenshot(options?: { fullPage?: boolean }): Promise<Uint8Array> {
    const buffer = await this.page.screenshot(options);
    return new Uint8Array(buffer);
  }

  async evaluate<T>(fn: string): Promise<T> {
    return this.page.evaluate(fn) as Promise<T>;
  }
}

export async function wrapPlaywrightPage(page: Page): Promise<BrowserPage> {
  return Promise.resolve(new PlaywrightPage(page));
}

export async function loadPlaywright(): Promise<PlaywrightModule> {
  try {
    const dynamicImport = new Function("specifier", "return import(specifier)") as (
      specifier: string,
    ) => Promise<PlaywrightModule>;
    return await dynamicImport("playwright");
  } catch {
    throw new Error("Playwright is not installed. Run `npm install playwright` before starting applications.");
  }
}

export type { Page, Browser as PlaywrightBrowser };