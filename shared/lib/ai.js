"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerResumeExtractionProvider = registerResumeExtractionProvider;
exports.getResumeExtractionProvider = getResumeExtractionProvider;
exports.registerJobMatchProvider = registerJobMatchProvider;
exports.getJobMatchProvider = getJobMatchProvider;
exports.registerResumeTailoringProvider = registerResumeTailoringProvider;
exports.getResumeTailoringProvider = getResumeTailoringProvider;
exports.registerCoverLetterProvider = registerCoverLetterProvider;
exports.getCoverLetterProvider = getCoverLetterProvider;
const providers = {
    resumeExtraction: null,
    jobMatch: null,
    resumeTailoring: null,
    coverLetter: null,
};
function registerResumeExtractionProvider(nextProvider) {
    providers.resumeExtraction = nextProvider;
}
function getResumeExtractionProvider() {
    return providers.resumeExtraction;
}
function registerJobMatchProvider(nextProvider) {
    providers.jobMatch = nextProvider;
}
function getJobMatchProvider() {
    return providers.jobMatch;
}
function registerResumeTailoringProvider(nextProvider) {
    providers.resumeTailoring = nextProvider;
}
function getResumeTailoringProvider() {
    return providers.resumeTailoring;
}
function registerCoverLetterProvider(nextProvider) {
    providers.coverLetter = nextProvider;
}
function getCoverLetterProvider() {
    return providers.coverLetter;
}
