"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectors = void 0;
const linkedin_1 = require("../collector/linkedin");
const wellfound_1 = require("../collector/wellfound");
exports.collectors = [
    new linkedin_1.LinkedInCollector(),
    new wellfound_1.WellfoundCollector(),
];
