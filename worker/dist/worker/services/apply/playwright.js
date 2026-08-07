"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.launchApplicationBrowser = launchApplicationBrowser;
const node_fs_1 = require("node:fs");
const logger_1 = require("./logger");
const forms_1 = require("./forms");
const submit_1 = require("./submit");
const upload_1 = require("./upload");
const matcher_1 = require("../matcher/matcher");
const settings_1 = require("../settings/settings");
const browser_adapter_1 = require("./browser-adapter");
const DEFAULT_TIMEOUT_MS = 60000;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1500;
async function launchApplicationBrowser(uid, applicationPackage) {
    const settings = await (0, settings_1.getSettings)(uid);
    const timeoutMs = settings.playwrightTimeoutMs || DEFAULT_TIMEOUT_MS;
    const resume = await (0, matcher_1.loadPrimaryResumeProfile)(uid);
    if (!resume) {
        throw new Error("No ResumeProfile found. Upload a resume before starting an application.");
    }
    if (!applicationPackage.tailoredResume) {
        throw new Error("Generate a tailored resume before starting an application.");
    }
    (0, logger_1.logApply)("info", "Starting application browser session", {
        jobId: applicationPackage.job.id,
        company: applicationPackage.job.company,
    });
    const playwright = await (0, browser_adapter_1.loadPlaywright)();
    let browser = null;
    try {
        browser = await (0, logger_1.withRetry)(() => playwright.chromium.launch({ headless: settings.playwrightHeadless, timeout: timeoutMs }), { attempts: MAX_RETRIES, delayMs: RETRY_DELAY_MS, label: "browser launch" });
        const rawPage = await browser.newPage();
        const page = await (0, browser_adapter_1.wrapPlaywrightPage)(rawPage);
        await (0, logger_1.withRetry)(() => page.goto(applicationPackage.job.applyUrl), { attempts: MAX_RETRIES, delayMs: RETRY_DELAY_MS, label: "page navigation" });
        const filledFields = [];
        const knownFields = (0, forms_1.getKnownApplicationFields)(resume).flatMap((field) => field.labels.map((label) => [label, field.value]));
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
            (0, logger_1.logApply)("warn", "Unknown form fields detected — pausing for manual review", {
                count: unknownFields.length,
                fields: unknownFields.join(", "),
            });
        }
        const reviewPageReached = await detectReviewPage(page);
        (0, logger_1.logApply)("info", "Application form prepared — stopping before submit", {
            filledFields: filledFields.length,
            unknownFields: unknownFields.length,
            reviewPageReached,
        });
        return {
            paused: true,
            message: (0, submit_1.getSubmitPauseMessage)(unknownFields, reviewPageReached),
            unknownFields,
            filledFields,
            reviewPageReached,
        };
    }
    catch (error) {
        (0, logger_1.logApply)("error", "Application browser session failed", {
            error: error instanceof Error ? error.message : "Unknown error",
        });
        throw error;
    }
    finally {
        if (browser) {
            (0, logger_1.logApply)("info", "Browser session left open for manual review");
        }
    }
}
async function fillKnownField(page, label, value) {
    return (0, logger_1.withRetry)(async () => {
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
                (0, logger_1.logApply)("info", "Filled known field", { label });
                return true;
            }
        }
        return false;
    }, { attempts: 2, delayMs: 500, label: `fill field "${label}"` }).catch(() => false);
}
async function uploadGeneratedFile(page, label, pdfUrl) {
    let filePath = null;
    let isTempFile = false;
    try {
        // Check if it's a Firebase Storage URL (not a public URL)
        if (!pdfUrl.startsWith("/generated/")) {
            // Download from URL (could be Firebase Storage or UploadThing)
            const tempFilePath = await (0, upload_1.downloadFromUrl)(pdfUrl);
            if (tempFilePath) {
                filePath = tempFilePath;
                isTempFile = true;
            }
        }
        else {
            // It's a public URL - use the local file path
            filePath = (0, upload_1.publicUrlToFilePath)(pdfUrl);
        }
        if (!filePath || !(0, node_fs_1.existsSync)(filePath)) {
            (0, logger_1.logApply)("warn", "Generated file not found for upload", { pdfUrl });
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
                (0, logger_1.logApply)("info", "Uploaded file via label", { label: label.source });
                return true;
            }
        }
        // Fallback to first file input
        if (fileInputs.length > 0) {
            await fileInputs[0].setInputFiles(filePath);
            (0, logger_1.logApply)("info", "Uploaded file via first file input");
            return true;
        }
        return false;
    }
    finally {
        // Clean up temporary file if we created one
        if (isTempFile && filePath) {
            await (0, upload_1.cleanupTempFile)(filePath);
        }
    }
}
async function detectUnknownFields(page) {
    var _a, _b, _c, _d, _e;
    const unknownFields = [];
    const inputs = await page.queryAll("input:not([type='hidden']):not([type='submit']):not([type='button']), textarea, select");
    for (const input of inputs) {
        const type = (_a = (await input.getAttribute("type"))) !== null && _a !== void 0 ? _a : "text";
        const name = (_b = (await input.getAttribute("name"))) !== null && _b !== void 0 ? _b : "";
        const id = (_c = (await input.getAttribute("id"))) !== null && _c !== void 0 ? _c : "";
        const placeholder = (_d = (await input.getAttribute("placeholder"))) !== null && _d !== void 0 ? _d : "";
        const ariaLabel = (_e = (await input.getAttribute("aria-label"))) !== null && _e !== void 0 ? _e : "";
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
function isKnownFieldIdentifier(identifier) {
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
async function detectReviewPage(page) {
    const url = page.url().toLowerCase();
    const reviewIndicators = await page.queryAll("[class*='review'], [id*='review'], [data-testid*='review'], h1, h2, h3");
    const count = Math.min(reviewIndicators.length, 20);
    for (let index = 0; index < count; index += 1) {
        const element = reviewIndicators[index];
        const text = await element.innerText().catch(async () => {
            var _a;
            return (_a = (await element.getAttribute("aria-label"))) !== null && _a !== void 0 ? _a : "";
        });
        if (/review|confirm|summary|submit application|final step/i.test(text)) {
            return true;
        }
    }
    return /review|confirm|summary|submit/i.test(url);
}
