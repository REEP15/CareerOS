"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeJob = normalizeJob;
exports.createJobIdentity = createJobIdentity;
exports.createJobDuplicateKey = createJobDuplicateKey;
exports.dedupeJobs = dedupeJobs;
const node_crypto_1 = require("node:crypto");
function normalizeJob(input, source) {
    var _a, _b;
    const title = normalizeText(input.title);
    const company = normalizeText(input.company);
    const location = normalizeText(input.location);
    const description = normalizeDescription(input.description);
    const applyUrl = input.applyUrl.trim();
    const normalizedSource = normalizeText((_a = input.source) !== null && _a !== void 0 ? _a : source);
    const salary = input.salary ? normalizeText(input.salary) : undefined;
    const scrapedAt = (_b = input.scrapedAt) !== null && _b !== void 0 ? _b : new Date().toISOString();
    const identity = createJobIdentity({ company, title, location });
    return {
        id: identity,
        title,
        company,
        location,
        salary,
        description,
        applyUrl,
        source: normalizedSource,
        scrapedAt,
    };
}
function createJobIdentity(job) {
    const canonical = createJobDuplicateKey(job);
    return (0, node_crypto_1.createHash)("sha1").update(canonical).digest("hex");
}
function createJobDuplicateKey(job) {
    return [job.company, job.title, job.location]
        .map((value) => value.trim().toLowerCase())
        .join("::");
}
function dedupeJobs(jobs) {
    const seen = new Set();
    const unique = [];
    let duplicates = 0;
    for (const job of jobs) {
        const duplicateKey = createJobDuplicateKey(job);
        if (seen.has(duplicateKey)) {
            duplicates += 1;
            continue;
        }
        seen.add(duplicateKey);
        unique.push(job);
    }
    return {
        jobs: unique,
        duplicates,
    };
}
function normalizeText(value) {
    return value.trim().replace(/\s+/g, " ");
}
function normalizeDescription(value) {
    return value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .join("\n");
}
