import { existsSync } from "node:fs";

import { logApply, withRetry } from "@/services/apply/logger";
import { getKnownApplicationFields } from "@/services/apply/forms";
import { getSubmitPauseMessage } from "@/services/apply/submit";
import { publicUrlToFilePath, downloadFromUrl, cleanupTempFile } from "@/services/apply/upload";
import type { ApplicationPackage } from "@/services/apply/tracker";
import { loadPrimaryResumeProfile } from "@/services/matcher/matcher";
import { getSettings } from "@/services/settings/settings";
import { escapeRegExp } from "../../../../shared/lib/utils";
import type { BrowserPage, BrowserElement, BoundingBox } from "../../../../shared/types/browser";
import { wrapPlaywrightPage, loadPlaywright, type Page as PlaywrightPage } from "./browser-adapter";

const DEFAULT_TIMEOUT_MS = 60_000;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1_500;

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
};

type Page = {
  goto: (url: string, options: { waitUntil: "domcontentloaded"; timeout?: number }) => Promise<unknown>;
  getByLabel: (label: string | RegExp) => Locator;
  locator: (selector: string) => Locator;
  url: () => string;
  waitForLoadState: (state: "load" | "domcontentloaded" | "networkidle") => Promise<void>;
};

export type PlaywrightApplyResult = {
  paused: boolean;
  message: string;
  unknownFields: string[];
  filledFields: string[];
  reviewPageReached: boolean;
};

export async function launchApplicationBrowser(uid: string, applicationPackage: ApplicationPackage): Promise<PlaywrightApplyResult> {
  const settings = await getSettings(uid);
  const timeoutMs = settings.playwrightTimeoutMs || DEFAULT_TIMEOUT_MS;
  const resume = await loadPrimaryResumeProfile(uid);

  if (!resume) {
    throw new Error("No ResumeProfile found. Upload a resume before starting an application.");
  }

  if (!applicationPackage.tailoredResume) {
    throw new Error("Generate a tailored resume before starting an application.");
  }

  logApply("info", "Starting application browser session", {
    jobId: applicationPackage.job.id,
    company: applicationPackage.job.company,
  });

  const playwright = await loadPlaywright();
  let browser: Browser | null = null;

  try {
    browser = await withRetry(
      () => playwright.chromium.launch({ headless: settings.playwrightHeadless, timeout: timeoutMs }),
      { attempts: MAX_RETRIES, delayMs: RETRY_DELAY_MS, label: "browser launch" },
    );

    const rawPage = await browser.newPage() as PlaywrightPage;
    const page = await wrapPlaywrightPage(rawPage);
    
    await withRetry(
      () => page.goto(applicationPackage.job.applyUrl),
      { attempts: MAX_RETRIES, delayMs: RETRY_DELAY_MS, label: "page navigation" },
    );

    const filledFields: string[] = [];
    const knownFields: Array<[string, string | undefined]> = getKnownApplicationFields(resume).flatMap((field) =>
      field.labels.map((label): [string, string | undefined] => [label, field.value]),
    );

    for (const [label, value] of knownFields) {
      if (!value) {
        continue;
      }

      const filled = await fillKnownField(page, label, value);
      if (filled) {
        filledFields.push(label);
      }
    }

    if (applicationPackage.tailoredResume) {
      const uploaded = await uploadGeneratedFile(page, /resume|cv/i, applicationPackage.tailoredResume.pdfUrl || "");
      if (uploaded) {
        filledFields.push("resume upload");
      }
    }

    if (applicationPackage.coverLetter) {
      const uploaded = await uploadGeneratedFile(page, /cover letter/i, applicationPackage.coverLetter.pdfUrl || "");
      if (uploaded) {
        filledFields.push("cover letter upload");
      }
    }

    const unknownFields = await detectUnknownFields(page);

    if (unknownFields.length > 0) {
      logApply("warn", "Unknown form fields detected — pausing for manual review", {
        count: unknownFields.length,
        fields: unknownFields.join(", "),
      });
    }

    const reviewPageReached = await detectReviewPage(page);

    logApply("info", "Application form prepared — stopping before submit", {
      filledFields: filledFields.length,
      unknownFields: unknownFields.length,
      reviewPageReached,
    });

    return {
      paused: true,
      message: getSubmitPauseMessage(unknownFields, reviewPageReached),
      unknownFields,
      filledFields,
      reviewPageReached,
    };
  } catch (error) {
    logApply("error", "Application browser session failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  } finally {
    if (browser) {
      logApply("info", "Browser session left open for manual review");
    }
  }
}

async function fillKnownField(page: BrowserPage, label: string, value: string): Promise<boolean> {
  return withRetry(
    async () => {
      // Try to find element by label text using selector
      const labelSelectors = [
        `input[placeholder*="${label}" i]`,
        `input[name*="${label}" i]`,
        `input[id*="${label}" i]`,
        `textarea[placeholder*="${label}" i]`,
        `textarea[name*="${label}" i]`,
      ];

      for (const selector of labelSelectors) {
        const el = await page.query(selector);
        if (el && (await el.isVisible())) {
          await el.fill(value);
          logApply("info", "Filled known field", { label });
          return true;
        }
      }

      return false;
    },
    { attempts: 2, delayMs: 500, label: `fill field "${label}"` },
  ).catch(() => false);
}

async function uploadGeneratedFile(page: BrowserPage, label: RegExp, pdfUrl: string): Promise<boolean> {
  let filePath: string | null = null;
  let isTempFile = false;

  try {
    // Check if it's a Firebase Storage URL (not a public URL)
    if (!pdfUrl.startsWith("/generated/")) {
      // Download from URL (could be Firebase Storage or UploadThing)
      const tempFilePath = await downloadFromUrl(pdfUrl);
      if (tempFilePath) {
        filePath = tempFilePath;
        isTempFile = true;
      }
    } else {
      // It's a public URL - use the local file path
      filePath = publicUrlToFilePath(pdfUrl);
    }

    if (!filePath || !existsSync(filePath)) {
      logApply("warn", "Generated file not found for upload", { pdfUrl });
      return false;
    }

    // Try to find file input by label
    const fileInputs = await page.queryAll("input[type='file']");
    
    for (const input of fileInputs) {
      const ariaLabel = await input.getAttribute("aria-label");
      const placeholder = await input.getAttribute("placeholder");
      const name = await input.getAttribute("name");
      
      const identifier = [ariaLabel, placeholder, name].filter(Boolean).join(" ").toLowerCase();
      
      if (label.test(identifier)) {
        await input.setInputFiles(filePath);
        logApply("info", "Uploaded file via label", { label: label.source });
        return true;
      }
    }

    // Fallback to first file input
    if (fileInputs.length > 0) {
      await fileInputs[0].setInputFiles(filePath);
      logApply("info", "Uploaded file via first file input");
      return true;
    }

    return false;
  } finally {
    // Clean up temporary file if we created one
    if (isTempFile && filePath) {
      await cleanupTempFile(filePath);
    }
  }
}

async function detectUnknownFields(page: BrowserPage): Promise<string[]> {
  const unknownFields: string[] = [];
  const inputs = await page.queryAll("input:not([type='hidden']):not([type='submit']):not([type='button']), textarea, select");

  for (const input of inputs) {
    const type = (await input.getAttribute("type")) ?? "text";
    const name = (await input.getAttribute("name")) ?? "";
    const id = (await input.getAttribute("id")) ?? "";
    const placeholder = (await input.getAttribute("placeholder")) ?? "";
    const ariaLabel = (await input.getAttribute("aria-label")) ?? "";
    const identifier = [name, id, placeholder, ariaLabel].filter(Boolean).join(" ").trim();

    if (!identifier) {
      continue;
    }

    const isKnown = isKnownFieldIdentifier(identifier);

    if (!isKnown && type !== "file") {
      const value = await input.inputValue().catch(() => "");

      if (!value) {
        unknownFields.push(identifier);
      }
    }
  }

  return [...new Set(unknownFields)];
}

function isKnownFieldIdentifier(identifier: string) {
  const normalized = identifier.toLowerCase();
  const knownPatterns = [
    "name",
    "email",
    "phone",
    "linkedin",
    "github",
    "portfolio",
    "website",
    "resume",
    "cv",
    "cover",
    "submit",
    "captcha",
    "recaptcha",
    "honeypot",
  ];

  return knownPatterns.some((pattern) => normalized.includes(pattern));
}

async function detectReviewPage(page: BrowserPage): Promise<boolean> {
  const url = page.url().toLowerCase();
  const reviewIndicators = await page.queryAll(
    "[class*='review'], [id*='review'], [data-testid*='review'], h1, h2, h3",
  );
  const count = Math.min(reviewIndicators.length, 20);

  for (let index = 0; index < count; index += 1) {
    const element = reviewIndicators[index];
    const text = await element.innerText().catch(async () => {
      return (await element.getAttribute("aria-label")) ?? "";
    });

    if (/review|confirm|summary|submit application|final step/i.test(text)) {
      return true;
    }
  }

  return /review|confirm|summary|submit/i.test(url);
}
