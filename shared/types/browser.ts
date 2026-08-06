/**
 * Browser abstraction types for automation layer
 * Mirrors v0_phase3/browser/types.ts for clean Playwright isolation
 */

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BrowserElement {
  tagName(): Promise<string>;
  getAttribute(name: string): Promise<string | null>;
  textContent(): Promise<string | null>;
  innerText(): Promise<string>;
  inputValue(): Promise<string>;
  isVisible(): Promise<boolean>;
  isEnabled(): Promise<boolean>;
  isChecked(): Promise<boolean>;
  fill(value: string): Promise<void>;
  type(value: string, options?: { delay?: number }): Promise<void>;
  click(): Promise<void>;
  check(): Promise<void>;
  uncheck(): Promise<void>;
  selectOption(value: { value?: string; label?: string } | string): Promise<string[]>;
  setInputFiles(files: string | string[]): Promise<void>;
  scrollIntoViewIfNeeded(): Promise<void>;
  boundingBox(): Promise<BoundingBox | null>;
  accessibleLabel(): Promise<string | null>;
  describedByText(): Promise<string | null>;
  options(): Promise<{ label: string; value: string }[]>;
  nearbyText(): Promise<string | null>;
}

export interface BrowserPage {
  url(): string;
  title(): Promise<string>;
  content(): Promise<string>;
  goto(url: string): Promise<void>;
  waitForLoadState(state: "load" | "domcontentloaded" | "networkidle"): Promise<void>;
  waitForTimeout(ms: number): Promise<void>;
  waitForSelector(selector: string, options?: { timeout?: number; state?: "attached" | "visible" }): Promise<BrowserElement | null>;
  query(selector: string): Promise<BrowserElement | null>;
  queryAll(selector: string): Promise<BrowserElement[]>;
  frames(): BrowserPage[];
  screenshot(options?: { fullPage?: boolean }): Promise<Uint8Array>;
  evaluate<T>(fn: string): Promise<T>;
}