"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchJob = matchJob;
exports.saveMatchResults = saveMatchResults;
exports.getStoredMatches = getStoredMatches;
exports.getMatchForJob = getMatchForJob;
exports.loadPrimaryResumeProfile = loadPrimaryResumeProfile;
exports.loadStoredJobs = loadStoredJobs;
const firestore_1 = require("firebase/firestore");
const firebase_1 = require("@/lib/firebase");
const parser_1 = require("./parser");
const prompts_1 = require("./prompts");
const scoring_1 = require("./scoring");
const ai_1 = require("@/lib/ai");
async function matchJob(resume, job) {
    var _a, _b, _c, _d, _e, _f;
    const provider = (0, ai_1.getJobMatchProvider)();
    const prompt = (0, prompts_1.createJobMatchPrompt)(resume, job);
    const parsedEvaluation = provider
        ? (0, parser_1.parseMatchResponse)((_a = (await provider.evaluateJobMatch({ prompt, resume, job }))) !== null && _a !== void 0 ? _a : "")
        : buildFallbackEvaluation(resume, job);
    const overallScore = (0, scoring_1.calculateOverallScore)({
        skillsScore: (_b = parsedEvaluation.skillsScore) !== null && _b !== void 0 ? _b : 0,
        experienceScore: (_c = parsedEvaluation.experienceScore) !== null && _c !== void 0 ? _c : 0,
        educationScore: (_d = parsedEvaluation.educationScore) !== null && _d !== void 0 ? _d : 0,
        locationScore: (_e = parsedEvaluation.locationScore) !== null && _e !== void 0 ? _e : 0,
        salaryScore: (_f = parsedEvaluation.salaryScore) !== null && _f !== void 0 ? _f : 0,
    });
    return {
        jobId: job.id,
        overallScore,
        confidence: (0, scoring_1.clampScore)(parsedEvaluation.confidence),
        skillsScore: (0, scoring_1.clampScore)(parsedEvaluation.skillsScore),
        experienceScore: (0, scoring_1.clampScore)(parsedEvaluation.experienceScore),
        educationScore: (0, scoring_1.clampScore)(parsedEvaluation.educationScore),
        locationScore: (0, scoring_1.clampScore)(parsedEvaluation.locationScore),
        salaryScore: (0, scoring_1.clampScore)(parsedEvaluation.salaryScore),
        resumePassProbability: (0, scoring_1.clampScore)(parsedEvaluation.resumePassProbability),
        interviewProbability: (0, scoring_1.clampScore)(parsedEvaluation.interviewProbability),
        strengths: parsedEvaluation.strengths.slice(0, 5),
        weaknesses: parsedEvaluation.weaknesses.slice(0, 5),
        missingSkills: parsedEvaluation.missingSkills.slice(0, 8),
        reasoning: parsedEvaluation.reasoning,
        recommended: parsedEvaluation.recommended || overallScore >= 70,
        createdAt: new Date().toISOString(),
    };
}
async function saveMatchResults(uid, results) {
    if (!(0, firebase_1.isFirebaseConfigured)()) {
        throw new Error("Firebase environment variables are missing.");
    }
    for (const result of results) {
        await (0, firestore_1.setDoc)((0, firestore_1.doc)((0, firebase_1.getUserMatchesCollection)(uid), result.jobId), result);
    }
}
async function getStoredMatches(uid) {
    if (!(0, firebase_1.isFirebaseConfigured)()) {
        return [];
    }
    const snapshot = await (0, firestore_1.getDocs)((0, firestore_1.query)((0, firebase_1.getUserMatchesCollection)(uid), (0, firestore_1.orderBy)("overallScore", "desc")));
    return snapshot.docs.map((document) => document.data());
}
async function getMatchForJob(uid, jobId) {
    if (!(0, firebase_1.isFirebaseConfigured)()) {
        return null;
    }
    const snapshot = await (0, firestore_1.getDoc)((0, firestore_1.doc)((0, firebase_1.getUserMatchesCollection)(uid), jobId));
    return snapshot.exists() ? snapshot.data() : null;
}
async function loadPrimaryResumeProfile(uid) {
    if (!(0, firebase_1.isFirebaseConfigured)()) {
        return null;
    }
    const snapshot = await (0, firestore_1.getDoc)((0, firestore_1.doc)((0, firebase_1.getUserResumeCollection)(uid), "primary"));
    if (!snapshot.exists()) {
        return null;
    }
    return snapshot.data();
}
async function loadStoredJobs(uid) {
    if (!(0, firebase_1.isFirebaseConfigured)()) {
        return [];
    }
    const snapshot = await (0, firestore_1.getDocs)((0, firestore_1.query)((0, firebase_1.getUserJobsCollection)(uid), (0, firestore_1.orderBy)("scrapedAt", "desc")));
    return snapshot.docs.map((document) => document.data());
}
function buildFallbackEvaluation(resume, job) {
    const normalizedResumeSkills = new Set(resume.skills.map((skill) => skill.trim().toLowerCase()));
    const jobKeywords = extractKeywords(`${job.title} ${job.description}`);
    const matchedSkills = [...normalizedResumeSkills].filter((skill) => jobKeywords.has(skill));
    const missingSkills = [...jobKeywords].filter((keyword) => !normalizedResumeSkills.has(keyword)).slice(0, 5);
    const skillsScore = jobKeywords.size > 0 ? (matchedSkills.length / jobKeywords.size) * 100 : 60;
    const experienceScore = inferExperienceScore(resume, jobKeywords);
    const educationScore = resume.education.length > 0 ? 75 : 35;
    const locationScore = inferLocationScore(resume, job);
    const salaryScore = inferSalaryScore(job);
    const overallScore = (0, scoring_1.calculateOverallScore)({
        skillsScore,
        experienceScore,
        educationScore,
        locationScore,
        salaryScore,
    });
    return {
        confidence: matchedSkills.length > 0 ? 72 : 55,
        skillsScore,
        experienceScore,
        educationScore,
        locationScore,
        salaryScore,
        resumePassProbability: (0, scoring_1.clampScore)(overallScore * 0.85 + skillsScore * 0.15),
        interviewProbability: (0, scoring_1.clampScore)(overallScore * 0.7 + experienceScore * 0.3),
        strengths: [
            matchedSkills.length > 0 ? `Aligned skills: ${matchedSkills.slice(0, 3).join(", ")}` : "Broad technical foundation",
            resume.preferredRoles.some((role) => job.title.toLowerCase().includes(role.toLowerCase()))
                ? "Preferred role alignment"
                : "Relevant role adjacency",
        ],
        weaknesses: [
            missingSkills.length > 0 ? `Gaps around ${missingSkills.slice(0, 2).join(", ")}` : "Limited explicit evidence in the resume",
        ],
        missingSkills,
        reasoning: buildFallbackReasoning({
            matchedSkills,
            missingSkills,
            locationScore,
            experienceScore,
            educationScore,
        }),
        recommended: overallScore >= 70,
    };
}
function inferExperienceScore(resume, jobKeywords) {
    const resumeSignals = [
        ...resume.experience.flatMap((experience) => [experience.title, experience.company, ...experience.highlights]),
        ...resume.projects.flatMap((project) => [project.name, project.description, ...project.technologies]),
        resume.summary,
    ]
        .join(" ")
        .toLowerCase();
    const matchingKeywords = [...jobKeywords].filter((keyword) => resumeSignals.includes(keyword));
    const baseline = resume.experience.length > 0 ? 55 : 30;
    return baseline + Math.min(40, matchingKeywords.length * 8);
}
function inferLocationScore(resume, job) {
    const preferredLocations = resume.preferredLocations.map((location) => location.toLowerCase());
    const preferredRoleLocations = resume.personal.location.toLowerCase();
    const jobLocation = job.location.toLowerCase();
    if (jobLocation.includes("remote")) {
        return 95;
    }
    if (preferredLocations.some((location) => jobLocation.includes(location))) {
        return 90;
    }
    if (jobLocation.includes(preferredRoleLocations)) {
        return 80;
    }
    return 50;
}
function inferSalaryScore(job) {
    return job.salary ? 75 : 50;
}
function extractKeywords(content) {
    const normalizedContent = content.toLowerCase();
    const trackedKeywords = [
        "typescript",
        "javascript",
        "react",
        "next.js",
        "nextjs",
        "node.js",
        "node",
        "firebase",
        "docker",
        "aws",
        "sql",
        "python",
        "ai",
        "machine learning",
        "frontend",
        "full stack",
        "platform",
        "product",
    ];
    return new Set(trackedKeywords
        .filter((keyword) => normalizedContent.includes(keyword))
        .map((keyword) => keyword.replace(".js", "").replace("nextjs", "next.js")));
}
function buildFallbackReasoning({ matchedSkills, missingSkills, locationScore, experienceScore, educationScore, }) {
    const strengths = matchedSkills.length > 0 ? `The resume aligns on ${matchedSkills.slice(0, 3).join(", ")}.` : "The resume shows adjacent technical experience.";
    const gaps = missingSkills.length > 0 ? `The largest gaps are ${missingSkills.slice(0, 3).join(", ")}.` : "No major skill gaps were inferred from the posting text.";
    const context = `Location fit scored ${locationScore}, experience fit scored ${experienceScore}, and education fit scored ${educationScore}.`;
    return `${strengths} ${gaps} ${context}`.trim();
}
