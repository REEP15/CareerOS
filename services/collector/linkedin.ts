import { BaseCollector } from "@/services/collector/base";
import { AutomationMode } from "@/types/collector";
import { LinkedInSeleniumCollector } from "./linkedin-selenium";

export class LinkedInCollector extends BaseCollector {
  name = "LinkedIn";
  mode = AutomationMode.DISCOVERY_ONLY;

  async collect() {
    // Delegate to Selenium-based collector for LinkedIn
    const seleniumCollector = new LinkedInSeleniumCollector();
    return seleniumCollector.collect();
  }
}
