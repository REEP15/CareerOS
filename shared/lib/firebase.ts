import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth as firebaseGetAuth, type Auth } from "firebase/auth";
import { collection, doc, getDoc, getFirestore, type CollectionReference, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

import type { Application } from "../types/application";
import type { ApiKeyStorage } from "../types/api-keys";
import type { CoverLetter } from "../types/coverLetter";
import type { JobPosting } from "../types/job";
import type { MatchResult } from "../types/match";
import type { Mission } from "../types/mission";
import type { Notification } from "../types/notification";
import type { ResumeProfile } from "../types/resume";
import type { AppSettings } from "../types/settings";
import type { TailoredResume } from "../types/tailoredResume";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const COLLECTIONS = {
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
} as const;

export const USER_COLLECTIONS = {
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
} as const;

export { doc, getDoc } from "firebase/firestore";

export function isFirebaseConfigured() {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId &&
      firebaseConfig.storageBucket &&
      firebaseConfig.messagingSenderId &&
      firebaseConfig.appId,
  );
}

function ensureFirebaseConfigured() {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase environment variables are missing.");
  }
}

let firebaseApp: FirebaseApp | null = null;
let auth: Auth | null = null;
let firestore: Firestore | null = null;
let storage: FirebaseStorage | null = null;

export function getFirebaseApp() {
  ensureFirebaseConfigured();

  if (!firebaseApp) {
    firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  }

  return firebaseApp;
}

export function getAuth() {
  ensureFirebaseConfigured();

  if (!auth) {
    auth = firebaseGetAuth(getFirebaseApp());
  }

  return auth;
}

export function getDb() {
  if (!firestore) {
    firestore = getFirestore(getFirebaseApp());
  }

  return firestore;
}

export function getFileStorage() {
  if (!storage) {
    storage = getStorage(getFirebaseApp());
  }

  return storage;
}

export function getResumeCollection(): CollectionReference<ResumeProfile> {
  return collection(getDb(), COLLECTIONS.resume) as CollectionReference<ResumeProfile>;
}

export function getJobsCollection(): CollectionReference<JobPosting> {
  return collection(getDb(), COLLECTIONS.jobs) as CollectionReference<JobPosting>;
}

export function getApplicationsCollection(): CollectionReference<Application> {
  return collection(getDb(), COLLECTIONS.applications) as CollectionReference<Application>;
}

export function getMatchesCollection(): CollectionReference<MatchResult> {
  return collection(getDb(), COLLECTIONS.matches) as CollectionReference<MatchResult>;
}

export function getMissionsCollection(): CollectionReference<Mission> {
  return collection(getDb(), COLLECTIONS.missions) as CollectionReference<Mission>;
}

export function getSettingsCollection(): CollectionReference<AppSettings> {
  return collection(getDb(), COLLECTIONS.settings) as CollectionReference<AppSettings>;
}

export function getNotificationsCollection(): CollectionReference<Notification> {
  return collection(getDb(), COLLECTIONS.notifications) as CollectionReference<Notification>;
}

export function getTailoredResumesCollection(): CollectionReference<TailoredResume> {
  return collection(getDb(), COLLECTIONS.tailoredResumes) as CollectionReference<TailoredResume>;
}

export function getCoverLettersCollection(): CollectionReference<CoverLetter> {
  return collection(getDb(), COLLECTIONS.coverLetters) as CollectionReference<CoverLetter>;
}

export function getApiKeysCollection(): CollectionReference<ApiKeyStorage> {
  return collection(getDb(), COLLECTIONS.apiKeys) as CollectionReference<ApiKeyStorage>;
}

// User-scoped collection helpers
export function getUserCollection(uid: string, collectionName: string) {
  return collection(getDb(), `users/${uid}/${collectionName}`);
}

export function getUserResumeCollection(uid: string): CollectionReference<ResumeProfile> {
  return collection(getDb(), `users/${uid}/${USER_COLLECTIONS.resume}`) as CollectionReference<ResumeProfile>;
}

export function getUserJobsCollection(uid: string): CollectionReference<JobPosting> {
  return collection(getDb(), `users/${uid}/${USER_COLLECTIONS.jobs}`) as CollectionReference<JobPosting>;
}

export function getUserApplicationsCollection(uid: string): CollectionReference<Application> {
  return collection(getDb(), `users/${uid}/${USER_COLLECTIONS.applications}`) as CollectionReference<Application>;
}

export function getUserMatchesCollection(uid: string): CollectionReference<MatchResult> {
  return collection(getDb(), `users/${uid}/${USER_COLLECTIONS.matches}`) as CollectionReference<MatchResult>;
}

export function getUserMissionsCollection(uid: string): CollectionReference<Mission> {
  return collection(getDb(), `users/${uid}/${USER_COLLECTIONS.missions}`) as CollectionReference<Mission>;
}

export function getUserSettingsCollection(uid: string): CollectionReference<AppSettings> {
  return collection(getDb(), `users/${uid}/${USER_COLLECTIONS.settings}`) as CollectionReference<AppSettings>;
}

export function getUserNotificationsCollection(uid: string): CollectionReference<Notification> {
  return collection(getDb(), `users/${uid}/${USER_COLLECTIONS.notifications}`) as CollectionReference<Notification>;
}

export function getUserTailoredResumesCollection(uid: string): CollectionReference<TailoredResume> {
  return collection(getDb(), `users/${uid}/${USER_COLLECTIONS.tailoredResumes}`) as CollectionReference<TailoredResume>;
}

export function getUserCoverLettersCollection(uid: string): CollectionReference<CoverLetter> {
  return collection(getDb(), `users/${uid}/${USER_COLLECTIONS.coverLetters}`) as CollectionReference<CoverLetter>;
}

export function getUserApiKeysCollection(uid: string): CollectionReference<ApiKeyStorage> {
  return collection(getDb(), `users/${uid}/${USER_COLLECTIONS.apiKeys}`) as CollectionReference<ApiKeyStorage>;
}

export function getUserAutomationStateCollection(uid: string) {
  return collection(getDb(), `users/${uid}/${USER_COLLECTIONS.automationState}`);
}

export function getUserAutomationLogsCollection(uid: string) {
  return collection(getDb(), `users/${uid}/${USER_COLLECTIONS.automationLogs}`);
}

export function createArtifactDocId(jobId: string, version: number) {
  return `${jobId}_v${version}`;
}

export function parseVersionLabel(versionLabel: string): number {
  const match = /^v(\d+)$/.exec(versionLabel);
  return match ? Number.parseInt(match[1], 10) : 1;
}

export function formatVersionLabel(version: number) {
  return `v${version}`;
}
