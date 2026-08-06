"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LinkedInSeleniumCollector = void 0;
const selenium_webdriver_1 = require("selenium-webdriver");
const chrome_1 = __importDefault(require("selenium-webdriver/chrome"));
const path_1 = __importDefault(require("path"));
const collector_1 = require("@/types/collector");
const normalize_1 = require("../collector/normalize");
class LinkedInSeleniumCollector {
    constructor() {
        this.name = "LinkedIn";
        this.mode = collector_1.AutomationMode.DISCOVERY_ONLY;
        // Use a dedicated Chrome profile for LinkedIn session persistence
        const userProfilePath = process.env.LINKEDIN_PROFILE_PATH || path_1.default.join(process.cwd(), ".linkedin-profile");
        this.profilePath = userProfilePath;
    }
    async collect() {
        const jobs = [];
        let driver = null;
        try {
            // Configure Chrome options with session persistence
            const options = new chrome_1.default.Options();
            options.addArguments(`--user-data-dir=${this.profilePath}`, "--profile-directory=Default", "--headless=new", "--no-sandbox", "--disable-dev-shm-usage", "--disable-blink-features=AutomationControlled");
            // Launch browser
            driver = await new selenium_webdriver_1.Builder()
                .forBrowser("chrome")
                .setChromeOptions(options)
                .build();
            // Navigate to LinkedIn jobs
            await driver.get("https://www.linkedin.com/jobs/search/");
            // Wait for page to load
            await driver.wait(selenium_webdriver_1.until.titleContains("Jobs"), 10000);
            // Check if user is authenticated
            const isAuthenticated = await this.checkAuthentication(driver);
            if (!isAuthenticated) {
                console.log("LinkedIn requires manual authentication. Please sign in manually in the Chrome profile.");
                return this.normalizeJobs([]);
            }
            // Perform search (using default search - can be parameterized later)
            await this.performSearch(driver);
            // Collect jobs with pagination
            let hasMoreJobs = true;
            let pageCount = 0;
            const maxPages = 20; // Safety limit
            while (hasMoreJobs && pageCount < maxPages) {
                // Extract jobs from current page
                const pageJobs = await this.extractJobsFromPage(driver);
                jobs.push(...pageJobs);
                // Try to go to next page
                hasMoreJobs = await this.goToNextPage(driver);
                pageCount++;
                // Rate limiting
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            console.log(`Collected ${jobs.length} jobs from LinkedIn across ${pageCount} pages`);
            return this.normalizeJobs(jobs);
        }
        catch (error) {
            console.error("LinkedIn collection error:", error);
            return this.normalizeJobs([]);
        }
        finally {
            if (driver) {
                await driver.quit();
            }
        }
    }
    async checkAuthentication(driver) {
        try {
            // Check if we're on the login page
            const currentUrl = await driver.getCurrentUrl();
            if (currentUrl.includes("login") || currentUrl.includes("auth")) {
                return false;
            }
            // Check if we can see job listings (indicates authenticated)
            await driver.wait(selenium_webdriver_1.until.elementLocated(selenium_webdriver_1.By.css(".job-card-container")), 5000);
            return true;
        }
        catch {
            return false;
        }
    }
    async performSearch(driver) {
        // Use default search - can be customized based on user preferences
        // For now, we'll use the default search results shown on the jobs page
        console.log("Using default LinkedIn job search");
    }
    async extractJobsFromPage(driver) {
        const jobs = [];
        try {
            // Wait for job cards to load
            await driver.wait(selenium_webdriver_1.until.elementLocated(selenium_webdriver_1.By.css(".job-card-container")), 10000);
            // Find all job cards
            const jobCards = await driver.findElements(selenium_webdriver_1.By.css(".job-card-container"));
            for (const card of jobCards) {
                try {
                    const title = await card.findElement(selenium_webdriver_1.By.css(".job-title span")).getText();
                    const company = await card.findElement(selenium_webdriver_1.By.css(".company-name span")).getText();
                    const location = await card.findElement(selenium_webdriver_1.By.css(".job-location span")).getText();
                    // Get the job link
                    const linkElement = await card.findElement(selenium_webdriver_1.By.css("a.job-card-container__link"));
                    const applyUrl = await linkElement.getAttribute("href");
                    if (title && company && applyUrl) {
                        jobs.push({
                            title: title.trim(),
                            company: company.trim(),
                            location: location.trim(),
                            description: "", // Would need to navigate to job detail page
                            applyUrl: applyUrl.trim(),
                        });
                    }
                }
                catch (e) {
                    // Skip failed extractions
                    continue;
                }
            }
        }
        catch (error) {
            console.error("Error extracting jobs from page:", error);
        }
        return jobs;
    }
    async goToNextPage(driver) {
        try {
            // Look for next button
            const nextButton = await driver.findElement(selenium_webdriver_1.By.css('button[aria-label="Next"]'));
            if (nextButton) {
                const isEnabled = await nextButton.isEnabled();
                if (isEnabled) {
                    await nextButton.click();
                    // Wait for next page to load
                    await driver.wait(selenium_webdriver_1.until.elementLocated(selenium_webdriver_1.By.css(".job-card-container")), 10000);
                    return true;
                }
            }
            return false;
        }
        catch {
            // No next button found or navigation failed
            return false;
        }
    }
    normalizeJobs(jobs) {
        return jobs.map((job) => (0, normalize_1.normalizeJob)(job, this.name));
    }
}
exports.LinkedInSeleniumCollector = LinkedInSeleniumCollector;
