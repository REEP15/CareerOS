import { existsSync } from "node:fs";

import { getKnownApplicationFields } from "@/services/apply/forms";
import { getSubmitPauseMessage } from "@/services/apply/submit";
import { publicUrlToFilePath } from "@/services/apply/upload";
import type { ApplicationPackage } from "@/services/apply/tracker";
import { loadPrimaryResumeProfile } from "@/services/matcher/matcher";

type PlaywrightModule = {
  chromium: {
    launch: (options: { headless: boolean }) => Promise<Browser>;
  };
};

type Browser = {
  newPage: () => Promise<Page>;
};

type Locator = {
  count: () => Promise<number>;
  first: () => Locator;
  fill: (value: string) => Promise<void>;
  setInputFiles: (filePath: string) => Promise<void>;
};

type Page = {
  goto: (url: string, options: { waitUntil: "domcontentloaded" }) => Promise<unknown>;
  getByLabel: (label: string | RegExp) => Locator;
  locator: (selector: string) => Locator;
};

export async function launchApplicationBrowser(applicationPackage: ApplicationPackage) {
  const playwright = await loadPlaywright();
  const resume = await loadPrimaryResumeProfile();

  if (!resume) {
    throw new Error("No ResumeProfile found. Upload a resume before starting an application.");
  }

  if (!applicationPackage.tailoredResume) {
    throw new Error("Generate a tailored resume before starting an application.");
  }

  const browser = await playwright.chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto(applicationPackage.job.applyUrl, { waitUntil: "domcontentloaded" });

  const knownFields: Array<[string, string | undefined]> = getKnownApplicationFields(resume).flatMap((field) =>
    field.labels.map((label): [string, string | undefined] => [label, field.value]),
  );
  await fillKnownFields(page, knownFields);

  await uploadGeneratedFile(page, /resume|cv/i, applicationPackage.tailoredResume.pdfUrl);

  if (applicationPackage.coverLetter) {
    await uploadGeneratedFile(page, /cover letter/i, applicationPackage.coverLetter.pdfUrl);
  }

  return {
    paused: true,
    message: getSubmitPauseMessage(),
  };
}

async function fillKnownFields(page: Page, fields: Array<[string, string | undefined]>) {
  for (const [label, value] of fields) {
    if (!value) {
      continue;
    }

    const locator = page.getByLabel(new RegExp(label, "i"));

    if ((await locator.count()) > 0) {
      await locator.first().fill(value);
    }
  }
}

async function uploadGeneratedFile(page: Page, label: RegExp, pdfUrl: string) {
  const filePath = publicUrlToFilePath(pdfUrl);

  if (!filePath || !existsSync(filePath)) {
    return;
  }

  const labelledInput = page.getByLabel(label);

  if ((await labelledInput.count()) > 0) {
    await labelledInput.first().setInputFiles(filePath);
    return;
  }

  const fileInputs = page.locator("input[type='file']");

  if ((await fileInputs.count()) > 0) {
    await fileInputs.first().setInputFiles(filePath);
  }
}

async function loadPlaywright() {
  try {
    const dynamicImport = new Function("specifier", "return import(specifier)") as (
      specifier: string,
    ) => Promise<PlaywrightModule>;
    return await dynamicImport("playwright");
  } catch {
    throw new Error("Playwright is not installed. Run `npm install playwright` before starting applications.");
  }
}
