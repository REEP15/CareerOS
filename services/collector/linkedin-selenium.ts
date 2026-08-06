import { Builder, By, until, WebDriver } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome";
import path from "path";
import type { CollectorJobInput } from "@/types/collector";
import { AutomationMode } from "@/types/collector";
import { normalizeJob } from "@/services/collector/normalize";
import type { JobPosting } from "@/types/job";

export class LinkedInSeleniumCollector {
  name = "LinkedIn";
  mode = AutomationMode.DISCOVERY_ONLY;

  private profilePath: string;

  constructor() {
    // Use a dedicated Chrome profile for LinkedIn session persistence
    const userProfilePath = process.env.LINKEDIN_PROFILE_PATH || path.join(process.cwd(), ".linkedin-profile");
    this.profilePath = userProfilePath;
  }

  async collect(): Promise<JobPosting[]> {
    const jobs: CollectorJobInput[] = [];
    let driver: WebDriver | null = null;

    try {
      // Configure Chrome options with session persistence
      const options = new chrome.Options();
      
      options.addArguments(
        `--user-data-dir=${this.profilePath}`,
        "--profile-directory=Default",
        "--headless=new",
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-blink-features=AutomationControlled"
      );

      // Launch browser
      driver = await new Builder()
        .forBrowser("chrome")
        .setChromeOptions(options)
        .build();

      // Navigate to LinkedIn jobs
      await driver.get("https://www.linkedin.com/jobs/search/");
      
      // Wait for page to load
      await driver.wait(until.titleContains("Jobs"), 10000);

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
    } catch (error) {
      console.error("LinkedIn collection error:", error);
      return this.normalizeJobs([]);
    } finally {
      if (driver) {
        await driver.quit();
      }
    }
  }

  private async checkAuthentication(driver: WebDriver): Promise<boolean> {
    try {
      // Check if we're on the login page
      const currentUrl = await driver.getCurrentUrl();
      if (currentUrl.includes("login") || currentUrl.includes("auth")) {
        return false;
      }

      // Check if we can see job listings (indicates authenticated)
      await driver.wait(until.elementLocated(By.css(".job-card-container")), 5000);
      return true;
    } catch {
      return false;
    }
  }

  private async performSearch(driver: WebDriver): Promise<void> {
    // Use default search - can be customized based on user preferences
    // For now, we'll use the default search results shown on the jobs page
    console.log("Using default LinkedIn job search");
  }

  private async extractJobsFromPage(driver: WebDriver): Promise<CollectorJobInput[]> {
    const jobs: CollectorJobInput[] = [];

    try {
      // Wait for job cards to load
      await driver.wait(until.elementLocated(By.css(".job-card-container")), 10000);

      // Find all job cards
      const jobCards = await driver.findElements(By.css(".job-card-container"));

      for (const card of jobCards) {
        try {
          const title = await card.findElement(By.css(".job-title span")).getText();
          const company = await card.findElement(By.css(".company-name span")).getText();
          const location = await card.findElement(By.css(".job-location span")).getText();
          
          // Get the job link
          const linkElement = await card.findElement(By.css("a.job-card-container__link"));
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
        } catch (e) {
          // Skip failed extractions
          continue;
        }
      }
    } catch (error) {
      console.error("Error extracting jobs from page:", error);
    }

    return jobs;
  }

  private async goToNextPage(driver: WebDriver): Promise<boolean> {
    try {
      // Look for next button
      const nextButton = await driver.findElement(By.css('button[aria-label="Next"]'));
      
      if (nextButton) {
        const isEnabled = await nextButton.isEnabled();
        if (isEnabled) {
          await nextButton.click();
          // Wait for next page to load
          await driver.wait(until.elementLocated(By.css(".job-card-container")), 10000);
          return true;
        }
      }
      
      return false;
    } catch {
      // No next button found or navigation failed
      return false;
    }
  }

  private normalizeJobs(jobs: CollectorJobInput[]) {
    return jobs.map((job) => normalizeJob(job, this.name));
  }
}
