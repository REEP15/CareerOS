import { doc, getDoc, getDocs, setDoc } from "firebase/firestore";

import { COLLECTIONS, getApplicationsCollection, getDb, isFirebaseConfigured } from "@/lib/firebase";
import type { Application } from "@/types/application";
import type { CoverLetter } from "@/types/coverLetter";
import type { JobPosting } from "@/types/job";
import type { MatchResult } from "@/types/match";
import type { TailoredResume } from "@/types/tailoredResume";

export type ApplicationPackage = {
  application: Application;
  coverLetter: CoverLetter | null;
  job: JobPosting;
  match: MatchResult | null;
  tailoredResume: TailoredResume | null;
};

export type ApplicationResult = {
  jobId: string;
  status: Application["status"];
  paused: boolean;
  message: string;
};

export async function getApplication(jobId: string): Promise<Application | null> {
  if (!isFirebaseConfigured()) {
    return null;
  }

  const snapshot = await getDoc(doc(getDb(), COLLECTIONS.applications, jobId));
  return snapshot.exists() ? (snapshot.data() as Application) : null;
}

export async function getStoredApplications() {
  if (!isFirebaseConfigured()) {
    return [];
  }

  const snapshot = await getDocs(getApplicationsCollection());
  return snapshot.docs.map((document) => document.data());
}

export async function upsertApplication(input: {
  coverLetterVersion?: string;
  jobId: string;
  resumeVersion?: string;
  status: Application["status"];
}) {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase environment variables are missing.");
  }

  const existing = await getApplication(input.jobId);
  const application: Application = {
    id: input.jobId,
    jobId: input.jobId,
    status: input.status,
    resumeVersion: input.resumeVersion ?? existing?.resumeVersion,
    coverLetterVersion: input.coverLetterVersion ?? existing?.coverLetterVersion,
    appliedAt: input.status === "Applied" ? new Date().toISOString() : existing?.appliedAt,
    updatedAt: new Date().toISOString(),
  };

  await setDoc(doc(getDb(), COLLECTIONS.applications, input.jobId), application);

  return application;
}

export async function loadApplicationPackage(jobId: string): Promise<ApplicationPackage> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase environment variables are missing.");
  }

  const [jobSnapshot, matchSnapshot, resumeSnapshot, coverLetterSnapshot, application] = await Promise.all([
    getDoc(doc(getDb(), COLLECTIONS.jobs, jobId)),
    getDoc(doc(getDb(), COLLECTIONS.matches, jobId)),
    getDoc(doc(getDb(), COLLECTIONS.tailoredResumes, jobId)),
    getDoc(doc(getDb(), COLLECTIONS.coverLetters, jobId)),
    getApplication(jobId),
  ]);

  if (!jobSnapshot.exists()) {
    throw new Error("Job not found.");
  }

  return {
    application:
      application ??
      ({
        id: jobId,
        jobId,
        status: "Not Applied",
      } satisfies Application),
    coverLetter: coverLetterSnapshot.exists() ? (coverLetterSnapshot.data() as CoverLetter) : null,
    job: jobSnapshot.data() as JobPosting,
    match: matchSnapshot.exists() ? (matchSnapshot.data() as MatchResult) : null,
    tailoredResume: resumeSnapshot.exists() ? (resumeSnapshot.data() as TailoredResume) : null,
  };
}
