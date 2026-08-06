"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseCollector = void 0;
const playwright_1 = require("playwright");
const normalize_1 = require("../collector/normalize");
class BaseCollector {
    normalizeJobs(jobs) {
        return jobs.map((job) => (0, normalize_1.normalizeJob)(job, this.name));
    }
    /**
     * Retry an operation with exponential backoff
     */
    async retry(operation, maxRetries = 3, baseDelay = 1000) {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                return await operation();
            }
            catch (error) {
                if (attempt === maxRetries - 1)
                    throw error;
                const delay = baseDelay * Math.pow(2, attempt);
                console.log(`Retry ${attempt + 1}/${maxRetries} after ${delay}ms delay`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        throw new Error('Max retries exceeded');
    }
    /**
     * Launch Playwright browser
     */
    async launchBrowser() {
        const browser = await playwright_1.chromium.launch({
            headless: true,
        });
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport: { width: 1920, height: 1080 },
        });
        const page = await context.newPage();
        return { browser, context, page };
    }
    /**
     * Safe scroll to load more content
     */
    async scrollPage(page, maxScrolls = 5) {
        for (let i = 0; i < maxScrolls; i++) {
            await page.evaluate(() => {
                globalThis.scrollTo(0, globalThis.document.body.scrollHeight);
            });
            await page.waitForTimeout(1000); // Wait for content to load
        }
    }
    /**
     * Wait for selector with timeout
     */
    async waitForSelector(page, selector, timeout = 5000) {
        try {
            await page.waitForSelector(selector, { timeout });
            return true;
        }
        catch {
            return false;
        }
    }
}
exports.BaseCollector = BaseCollector;
