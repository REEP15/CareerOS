import type { JobCollector } from "@/types/collector";
import type { JobPosting } from "@/types/job";
import type { CollectorJobInput, AutomationMode } from "@/types/collector";
import { chromium, type Browser, type Page, type BrowserContext } from "playwright";

import { normalizeJob } from "@/services/collector/normalize";

export abstract class BaseCollector implements JobCollector {
  abstract name: string;
  abstract mode: AutomationMode;
  abstract collect(): Promise<JobPosting[]>;

  protected normalizeJobs(jobs: CollectorJobInput[]) {
    return jobs.map((job) => normalizeJob(job, this.name));
  }

  /**
   * Retry an operation with exponential backoff
   */
  protected async retry<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    baseDelay = 1000
  ): Promise<T> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxRetries - 1) throw error;
        
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
  protected async launchBrowser(): Promise<{ browser: Browser; context: BrowserContext; page: Page }> {
    const browser = await chromium.launch({
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
  protected async scrollPage(page: Page, maxScrolls = 5): Promise<void> {
    for (let i = 0; i < maxScrolls; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1000); // Wait for content to load
    }
  }

  /**
   * Wait for selector with timeout
   */
  protected async waitForSelector(page: Page, selector: string, timeout = 5000): Promise<boolean> {
    try {
      await page.waitForSelector(selector, { timeout });
      return true;
    } catch {
      return false;
    }
  }
}
