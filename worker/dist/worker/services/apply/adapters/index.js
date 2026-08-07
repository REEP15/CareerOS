"use strict";
/**
 * Adapter registration
 * Mirrors v0_phase3/adapters/index.ts with SmartRecruiters instead of iCIMS
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmartRecruitersAdapter = exports.WorkdayAdapter = exports.WorkableAdapter = exports.WellfoundAdapter = exports.NaukriAdapter = exports.LeverAdapter = exports.IndeedAdapter = exports.GreenhouseAdapter = exports.AshbyAdapter = void 0;
exports.createDefaultAdapters = createDefaultAdapters;
exports.buildRegistry = buildRegistry;
const base_1 = require("./base");
const ashby_1 = require("./ashby");
Object.defineProperty(exports, "AshbyAdapter", { enumerable: true, get: function () { return ashby_1.AshbyAdapter; } });
const greenhouse_1 = require("./greenhouse");
Object.defineProperty(exports, "GreenhouseAdapter", { enumerable: true, get: function () { return greenhouse_1.GreenhouseAdapter; } });
const indeed_1 = require("./indeed");
Object.defineProperty(exports, "IndeedAdapter", { enumerable: true, get: function () { return indeed_1.IndeedAdapter; } });
const lever_1 = require("./lever");
Object.defineProperty(exports, "LeverAdapter", { enumerable: true, get: function () { return lever_1.LeverAdapter; } });
const naukri_1 = require("./naukri");
Object.defineProperty(exports, "NaukriAdapter", { enumerable: true, get: function () { return naukri_1.NaukriAdapter; } });
const wellfound_1 = require("./wellfound");
Object.defineProperty(exports, "WellfoundAdapter", { enumerable: true, get: function () { return wellfound_1.WellfoundAdapter; } });
const workable_1 = require("./workable");
Object.defineProperty(exports, "WorkableAdapter", { enumerable: true, get: function () { return workable_1.WorkableAdapter; } });
const workday_1 = require("./workday");
Object.defineProperty(exports, "WorkdayAdapter", { enumerable: true, get: function () { return workday_1.WorkdayAdapter; } });
const smartrecruiters_1 = require("./smartrecruiters");
Object.defineProperty(exports, "SmartRecruitersAdapter", { enumerable: true, get: function () { return smartrecruiters_1.SmartRecruitersAdapter; } });
/** All supported site adapters, in detection priority order. */
function createDefaultAdapters() {
    return [
        // Dedicated ATS platforms (most specific DOM signatures first).
        new greenhouse_1.GreenhouseAdapter(),
        new lever_1.LeverAdapter(),
        new workday_1.WorkdayAdapter(),
        new ashby_1.AshbyAdapter(),
        new smartrecruiters_1.SmartRecruitersAdapter(),
        new workable_1.WorkableAdapter(),
        // Job boards.
        new naukri_1.NaukriAdapter(),
        new indeed_1.IndeedAdapter(),
        new wellfound_1.WellfoundAdapter(),
    ];
}
/** Build a registry with all supported adapters */
function buildRegistry() {
    return new base_1.AdapterRegistry().registerAll(createDefaultAdapters());
}
