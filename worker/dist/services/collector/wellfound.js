"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WellfoundCollector = void 0;
const base_1 = require("../collector/base");
const collector_1 = require("@/types/collector");
class WellfoundCollector extends base_1.BaseCollector {
    constructor() {
        super(...arguments);
        this.name = "Wellfound";
        this.mode = collector_1.AutomationMode.DISCOVERY_ONLY;
    }
    async collect() {
        return this.retry(async () => {
            const { browser, context, page } = await this.launchBrowser();
            try {
                // Navigate to Wellfound jobs
                await page.goto('https://www.wellfound.com/jobs', {
                    waitUntil: 'domcontentloaded',
                    timeout: 60000,
                });
                // Wait for job listings to load - using common Wellfound selectors
                const hasJobs = await this.waitForSelector(page, 'a[href*="/jobs/"]', 10000);
                if (!hasJobs) {
                    console.log('No jobs found on Wellfound');
                    return this.normalizeJobs([]);
                }
                const jobs = [];
                const seenUrls = new Set();
                let hasMoreJobs = true;
                let scrollCount = 0;
                let lastJobCardCount = 0;
                let noNewCardsCount = 0;
                const maxScrolls = 30; // Limit to prevent infinite loops
                const noNewCardsThreshold = 3; // Stop if no new cards for 3 consecutive scrolls
                while (hasMoreJobs && scrollCount < maxScrolls) {
                    // Extract job cards from current view
                    // Wellfound job listings are typically in anchor tags linking to job pages
                    const jobLinks = await page.$$('a[href*="/jobs/"]');
                    const currentJobCardCount = jobLinks.length;
                    // Extract jobs only from new cards to avoid duplicates
                    for (let i = lastJobCardCount; i < currentJobCardCount; i++) {
                        const link = jobLinks[i];
                        try {
                            const applyUrl = await link.getAttribute('href');
                            const fullUrl = applyUrl ? `https://www.wellfound.com${applyUrl}` : '';
                            // Skip if we've already seen this job URL
                            if (seenUrls.has(fullUrl)) {
                                continue;
                            }
                            seenUrls.add(fullUrl);
                            // Try to extract job details from the link text and surrounding elements
                            const text = await link.textContent();
                            const title = (text === null || text === void 0 ? void 0 : text.trim()) || '';
                            // Company is often in a parent element or nearby
                            const parent = await link.evaluateHandle((el) => el.parentElement);
                            const parentText = await parent.evaluate((el) => el.textContent || '');
                            await parent.dispose();
                            // Try to extract company name from the parent text
                            const companyMatch = parentText === null || parentText === void 0 ? void 0 : parentText.match(/at\s+([^\n•]+)/i);
                            const company = companyMatch ? companyMatch[1].trim() : '';
                            // Location and salary might be in sibling elements
                            const location = await this.extractField(link, 'location') || 'Remote';
                            const salary = await this.extractField(link, 'salary') || undefined;
                            if (title && fullUrl) {
                                jobs.push({
                                    title,
                                    company: company || 'Unknown',
                                    location,
                                    salary,
                                    description: '', // Would need to navigate to job detail page
                                    applyUrl: fullUrl,
                                });
                            }
                        }
                        catch (e) {
                            // Skip failed extractions
                            continue;
                        }
                    }
                    // Check if we got new job cards
                    if (currentJobCardCount <= lastJobCardCount) {
                        noNewCardsCount++;
                        if (noNewCardsCount >= noNewCardsThreshold) {
                            hasMoreJobs = false;
                        }
                    }
                    else {
                        noNewCardsCount = 0;
                        lastJobCardCount = currentJobCardCount;
                    }
                    // Scroll to load more jobs (infinite scroll)
                    await this.scrollPage(page, 1);
                    scrollCount++;
                    // Check if we've reached the end by looking for a "no more jobs" message
                    const noMoreJobs = await page.$('text:has-text("no more")');
                    if (noMoreJobs) {
                        hasMoreJobs = false;
                    }
                }
                console.log(`Collected ${jobs.length} jobs from Wellfound`);
                return this.normalizeJobs(jobs);
            }
            catch (error) {
                console.error('Wellfound collection error:', error);
                return this.normalizeJobs([]);
            }
            finally {
                await browser.close();
            }
        }, 3, 2000); // 3 retries with 2s base delay
    }
    async extractField(link, fieldName) {
        try {
            // Try to find the field in nearby elements
            const parent = await link.evaluateHandle((el) => el.parentElement);
            const fieldElement = await parent.evaluate((el, field) => {
                const text = el.textContent || '';
                const regex = new RegExp(field, 'i');
                const match = text.match(regex);
                return match ? match[0] : null;
            }, fieldName);
            await parent.dispose();
            return fieldElement || undefined;
        }
        catch {
            return undefined;
        }
    }
}
exports.WellfoundCollector = WellfoundCollector;
