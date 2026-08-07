"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LinkedInCollector = void 0;
const base_1 = require("../collector/base");
const collector_1 = require("@/types/collector");
const linkedin_selenium_1 = require("./linkedin-selenium");
class LinkedInCollector extends base_1.BaseCollector {
    constructor() {
        super(...arguments);
        this.name = "LinkedIn";
        this.mode = collector_1.AutomationMode.DISCOVERY_ONLY;
    }
    async collect() {
        // Delegate to Selenium-based collector for LinkedIn
        const seleniumCollector = new linkedin_selenium_1.LinkedInSeleniumCollector();
        return seleniumCollector.collect();
    }
}
exports.LinkedInCollector = LinkedInCollector;
