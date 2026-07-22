import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { collection, getFirestore, type CollectionReference, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

import type { Application } from "@/types/application";
import type { JobPosting } from "@/types/job";
import type { MatchResult } from "@/types/match";
import type { Mission } from "@/types/mission";
import type { ResumeProfile } from "@/types/resume";

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
  matches: "matches",
  missions: "missions",
  settings: "settings",
} as const;

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
let firestore: Firestore | null = null;
let storage: FirebaseStorage | null = null;

export function getFirebaseApp() {
  ensureFirebaseConfigured();

  if (!firebaseApp) {
    firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  }

  return firebaseApp;
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
