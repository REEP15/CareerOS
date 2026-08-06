"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDoc = exports.doc = exports.USER_COLLECTIONS = exports.COLLECTIONS = void 0;
exports.isFirebaseConfigured = isFirebaseConfigured;
exports.getFirebaseApp = getFirebaseApp;
exports.getAuth = getAuth;
exports.getDb = getDb;
exports.getFileStorage = getFileStorage;
exports.getResumeCollection = getResumeCollection;
exports.getJobsCollection = getJobsCollection;
exports.getApplicationsCollection = getApplicationsCollection;
exports.getMatchesCollection = getMatchesCollection;
exports.getMissionsCollection = getMissionsCollection;
exports.getSettingsCollection = getSettingsCollection;
exports.getNotificationsCollection = getNotificationsCollection;
exports.getTailoredResumesCollection = getTailoredResumesCollection;
exports.getCoverLettersCollection = getCoverLettersCollection;
exports.getApiKeysCollection = getApiKeysCollection;
exports.getUserCollection = getUserCollection;
exports.getUserResumeCollection = getUserResumeCollection;
exports.getUserJobsCollection = getUserJobsCollection;
exports.getUserApplicationsCollection = getUserApplicationsCollection;
exports.getUserMatchesCollection = getUserMatchesCollection;
exports.getUserMissionsCollection = getUserMissionsCollection;
exports.getUserSettingsCollection = getUserSettingsCollection;
exports.getUserNotificationsCollection = getUserNotificationsCollection;
exports.getUserTailoredResumesCollection = getUserTailoredResumesCollection;
exports.getUserCoverLettersCollection = getUserCoverLettersCollection;
exports.getUserApiKeysCollection = getUserApiKeysCollection;
exports.getUserAutomationStateCollection = getUserAutomationStateCollection;
exports.getUserAutomationLogsCollection = getUserAutomationLogsCollection;
exports.createArtifactDocId = createArtifactDocId;
exports.parseVersionLabel = parseVersionLabel;
exports.formatVersionLabel = formatVersionLabel;
const app_1 = require("firebase/app");
const auth_1 = require("firebase/auth");
const firestore_1 = require("firebase/firestore");
const storage_1 = require("firebase/storage");
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};
exports.COLLECTIONS = {
    resume: "resume",
    jobs: "jobs",
    applications: "applications",
    coverLetters: "coverLetters",
    matches: "matches",
    missions: "missions",
    settings: "settings",
    tailoredResumes: "tailoredResumes",
    notifications: "notifications",
    apiKeys: "apiKeys",
    automationState: "automationState",
    automationLogs: "automationLogs",
};
exports.USER_COLLECTIONS = {
    profile: "profile",
    settings: "settings",
    apiKeys: "apiKeys",
    resume: "resume",
    jobs: "jobs",
    missions: "missions",
    applications: "applications",
    coverLetters: "coverLetters",
    matches: "matches",
    tailoredResumes: "tailoredResumes",
    notifications: "notifications",
    automationState: "automationState",
    automationLogs: "automationLogs",
};
var firestore_2 = require("firebase/firestore");
Object.defineProperty(exports, "doc", { enumerable: true, get: function () { return firestore_2.doc; } });
Object.defineProperty(exports, "getDoc", { enumerable: true, get: function () { return firestore_2.getDoc; } });
function isFirebaseConfigured() {
    return Boolean(firebaseConfig.apiKey &&
        firebaseConfig.authDomain &&
        firebaseConfig.projectId &&
        firebaseConfig.storageBucket &&
        firebaseConfig.messagingSenderId &&
        firebaseConfig.appId);
}
function ensureFirebaseConfigured() {
    if (!isFirebaseConfigured()) {
        throw new Error("Firebase environment variables are missing.");
    }
}
let firebaseApp = null;
let auth = null;
let firestore = null;
let storage = null;
function getFirebaseApp() {
    ensureFirebaseConfigured();
    if (!firebaseApp) {
        firebaseApp = (0, app_1.getApps)().length > 0 ? (0, app_1.getApp)() : (0, app_1.initializeApp)(firebaseConfig);
    }
    return firebaseApp;
}
function getAuth() {
    ensureFirebaseConfigured();
    if (!auth) {
        auth = (0, auth_1.getAuth)(getFirebaseApp());
    }
    return auth;
}
function getDb() {
    if (!firestore) {
        firestore = (0, firestore_1.getFirestore)(getFirebaseApp());
    }
    return firestore;
}
function getFileStorage() {
    if (!storage) {
        storage = (0, storage_1.getStorage)(getFirebaseApp());
    }
    return storage;
}
function getResumeCollection() {
    return (0, firestore_1.collection)(getDb(), exports.COLLECTIONS.resume);
}
function getJobsCollection() {
    return (0, firestore_1.collection)(getDb(), exports.COLLECTIONS.jobs);
}
function getApplicationsCollection() {
    return (0, firestore_1.collection)(getDb(), exports.COLLECTIONS.applications);
}
function getMatchesCollection() {
    return (0, firestore_1.collection)(getDb(), exports.COLLECTIONS.matches);
}
function getMissionsCollection() {
    return (0, firestore_1.collection)(getDb(), exports.COLLECTIONS.missions);
}
function getSettingsCollection() {
    return (0, firestore_1.collection)(getDb(), exports.COLLECTIONS.settings);
}
function getNotificationsCollection() {
    return (0, firestore_1.collection)(getDb(), exports.COLLECTIONS.notifications);
}
function getTailoredResumesCollection() {
    return (0, firestore_1.collection)(getDb(), exports.COLLECTIONS.tailoredResumes);
}
function getCoverLettersCollection() {
    return (0, firestore_1.collection)(getDb(), exports.COLLECTIONS.coverLetters);
}
function getApiKeysCollection() {
    return (0, firestore_1.collection)(getDb(), exports.COLLECTIONS.apiKeys);
}
// User-scoped collection helpers
function getUserCollection(uid, collectionName) {
    return (0, firestore_1.collection)(getDb(), `users/${uid}/${collectionName}`);
}
function getUserResumeCollection(uid) {
    return (0, firestore_1.collection)(getDb(), `users/${uid}/${exports.USER_COLLECTIONS.resume}`);
}
function getUserJobsCollection(uid) {
    return (0, firestore_1.collection)(getDb(), `users/${uid}/${exports.USER_COLLECTIONS.jobs}`);
}
function getUserApplicationsCollection(uid) {
    return (0, firestore_1.collection)(getDb(), `users/${uid}/${exports.USER_COLLECTIONS.applications}`);
}
function getUserMatchesCollection(uid) {
    return (0, firestore_1.collection)(getDb(), `users/${uid}/${exports.USER_COLLECTIONS.matches}`);
}
function getUserMissionsCollection(uid) {
    return (0, firestore_1.collection)(getDb(), `users/${uid}/${exports.USER_COLLECTIONS.missions}`);
}
function getUserSettingsCollection(uid) {
    return (0, firestore_1.collection)(getDb(), `users/${uid}/${exports.USER_COLLECTIONS.settings}`);
}
function getUserNotificationsCollection(uid) {
    return (0, firestore_1.collection)(getDb(), `users/${uid}/${exports.USER_COLLECTIONS.notifications}`);
}
function getUserTailoredResumesCollection(uid) {
    return (0, firestore_1.collection)(getDb(), `users/${uid}/${exports.USER_COLLECTIONS.tailoredResumes}`);
}
function getUserCoverLettersCollection(uid) {
    return (0, firestore_1.collection)(getDb(), `users/${uid}/${exports.USER_COLLECTIONS.coverLetters}`);
}
function getUserApiKeysCollection(uid) {
    return (0, firestore_1.collection)(getDb(), `users/${uid}/${exports.USER_COLLECTIONS.apiKeys}`);
}
function getUserAutomationStateCollection(uid) {
    return (0, firestore_1.collection)(getDb(), `users/${uid}/${exports.USER_COLLECTIONS.automationState}`);
}
function getUserAutomationLogsCollection(uid) {
    return (0, firestore_1.collection)(getDb(), `users/${uid}/${exports.USER_COLLECTIONS.automationLogs}`);
}
function createArtifactDocId(jobId, version) {
    return `${jobId}_v${version}`;
}
function parseVersionLabel(versionLabel) {
    const match = /^v(\d+)$/.exec(versionLabel);
    return match ? Number.parseInt(match[1], 10) : 1;
}
function formatVersionLabel(version) {
    return `v${version}`;
}
