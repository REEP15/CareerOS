import { doc, getDoc, getDocs, setDoc } from "firebase/firestore";

import { getUserApplicationsCollection, getUserJobsCollection, getUserMatchesCollection, getDb, isFirebaseConfigured } from "@/lib/firebase";
import { ApplicationStatus, type Application, type ApplicationTimelineEvent } from "@/types/application";
import type { CoverLetter } from "@/types/coverLetter";
import type { JobPosting } from "@/types/job";
import type { MatchResult } from "@/types/match";
import type { TailoredResume } from "@/types/tailoredResume";
import { getCoverLetter } from "@/services/coverLetter/generator";
import { getTailoredResume } from "@/services/tailoring/tailor";

export type ApplicationPackage = {
  application: Application;
  coverLetter: CoverLetter | null;
  job: JobPosting;
  match: MatchResult | null;
  tailoredResume: TailoredResume | null;
};

export type ApplicationResult = {
  jobId: string;
  status: ApplicationStatus;
  paused: boolean;
  message: string;
  unknownFields?: string[];
};

export async function getApplication(uid: string, jobId: string): Promise<Application | null> {
  if (!isFirebaseConfigured()) {
    return null;
  }

  const snapshot = await getDoc(doc(getUserApplicationsCollection(uid), jobId));
  return snapshot.exists() ? normalizeApplication(snapshot.data() as Application) : null;
}

export async function getStoredApplications(uid: string) {
  if (!isFirebaseConfigured()) {
    return [];
  }

  const snapshot = await getDocs(getUserApplicationsCollection(uid));
  return snapshot.docs.map((document) => normalizeApplication(document.data()));
}

function normalizeApplication(application: Application): Application {
  return {
    ...application,
    status: application.status ?? ApplicationStatus.NOT_APPLIED,
    timeline: application.timeline ?? [],
  };
}

function appendTimelineEvent(
  existing: ApplicationTimelineEvent[] | undefined,
  status: ApplicationStatus,
  note?: string,
): ApplicationTimelineEvent[] {
  return [
    ...(existing ?? []),
    {
      status,
      timestamp: new Date().toISOString(),
      note,
    },
  ];
}

export async function upsertApplication(uid: string, input: {
  coverLetterVersion?: string;
  jobId: string;
  notes?: string;
  resumeVersion?: string;
  status: ApplicationStatus;
  timelineNote?: string;
}) {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase environment variables are missing.");
  }

  const existing = await getApplication(uid, input.jobId);
  const statusChanged = existing?.status !== input.status;
  const application: Application = {
    id: input.jobId,
    jobId: input.jobId,
    status: input.status,
    resumeVersion: input.resumeVersion ?? existing?.resumeVersion,
    coverLetterVersion: input.coverLetterVersion ?? existing?.coverLetterVersion,
    appliedAt: input.status === ApplicationStatus.APPLIED ? new Date().toISOString() : existing?.appliedAt,
    updatedAt: new Date().toISOString(),
    notes: input.notes ?? existing?.notes,
    timeline: statusChanged
      ? appendTimelineEvent(existing?.timeline, input.status, input.timelineNote)
      : existing?.timeline ?? [],
  };

  await setDoc(doc(getUserApplicationsCollection(uid), input.jobId), application);

  return application;
}

export async function updateApplicationStatus(uid: string, jobId: string, status: ApplicationStatus, note?: string) {
  return upsertApplication(uid, { jobId, status, timelineNote: note });
}

export async function updateApplicationNotes(uid: string, jobId: string, notes: string) {
  const existing = await getApplication(uid, jobId);

  if (!existing) {
    return upsertApplication(uid, {
      jobId,
      status: ApplicationStatus.NOT_APPLIED,
      notes,
    });
  }

  return upsertApplication(uid, {
    jobId,
    status: existing.status,
    notes,
  });
}

export async function loadApplicationPackage(uid: string, jobId: string): Promise<ApplicationPackage> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase environment variables are missing.");
  }

  const application = await getApplication(uid, jobId);
  const [jobSnapshot, matchSnapshot] = await Promise.all([
    getDoc(doc(getUserJobsCollection(uid), jobId)),
    getDoc(doc(getUserMatchesCollection(uid), jobId)),
  ]);

  if (!jobSnapshot.exists()) {
    throw new Error("Job not found.");
  }

  const resumeVersion = application?.resumeVersion;
  const coverLetterVersion = application?.coverLetterVersion;

  const [tailoredResume, coverLetter] = await Promise.all([
    getTailoredResume(uid, jobId, resumeVersion),
    getCoverLetter(uid, jobId, coverLetterVersion),
  ]);

  return {
    application:
      application ??
      ({
        id: jobId,
        jobId,
        status: ApplicationStatus.NOT_APPLIED,
        timeline: [],
      } satisfies Application),
    coverLetter,
    job: jobSnapshot.data() as JobPosting,
    match: matchSnapshot.exists() ? (matchSnapshot.data() as MatchResult) : null,
    tailoredResume,
  };
}
