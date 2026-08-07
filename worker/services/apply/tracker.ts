import { doc, getDoc, setDoc, collection, getDocs, query, orderBy } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { ApplicationStatus } from "@/types/application";
import type { Application, ApplicationPackage as StoredApplicationPackage } from "@/types/application";
import type { JobPosting } from "@/types/job";
import type { MatchResult } from "@/types/match";
import type { ResumeProfile } from "@/types/resume";
import { createApplicationPackageService } from "../tailoring/package";

export type ApplicationResult = {
  jobId: string;
  status: ApplicationStatus;
  paused: boolean;
  message: string;
  unknownFields?: string[];
};

export type ApplicationPackage = {
  application: Application;
  coverLetter: {
    versionLabel: string;
    content: string;
    pdfUrl?: string;
  } | null;
  job: JobPosting;
  match: MatchResult | null;
  tailoredResume: {
    versionLabel: string;
    content: ResumeProfile;
    pdfUrl?: string;
    diff: NonNullable<StoredApplicationPackage["tailoredResume"]>["diff"];
  } | null;
};

export async function getStoredApplications(uid: string): Promise<Application[]> {
  const db = getDb();
  const applicationsCollection = collection(db, `users/${uid}/applications`);
  const snapshot = await getDocs(query(applicationsCollection, orderBy("updatedAt", "desc")));
  return snapshot.docs.map((doc) => doc.data() as Application);
}

export async function getApplication(uid: string, jobId: string): Promise<Application | null> {
  const db = getDb();
  const docRef = doc(db, `users/${uid}/applications/${jobId}`);
  const snapshot = await getDoc(docRef);
  return snapshot.exists() ? (snapshot.data() as Application) : null;
}

export async function upsertApplication(uid: string, input: {
  jobId: string;
  status: ApplicationStatus;
  resumeVersion?: string;
  coverLetterVersion?: string;
  timelineNote?: string;
  notes?: string;
}): Promise<Application> {
  const db = getDb();
  const docRef = doc(db, `users/${uid}/applications/${input.jobId}`);
  const snapshot = await getDoc(docRef);

  const now = new Date().toISOString();
  const existing: Application = snapshot.exists() ? (snapshot.data() as Application) : {
    id: input.jobId,
    userId: uid,
    jobId: input.jobId,
    status: ApplicationStatus.NOT_APPLIED,
    createdAt: now,
    updatedAt: now,
  };

  const updated: Application = {
    ...existing,
    status: input.status,
    resumeVersion: input.resumeVersion ?? existing.resumeVersion,
    coverLetterVersion: input.coverLetterVersion ?? existing.coverLetterVersion,
    notes: input.notes ?? existing.notes,
    updatedAt: now,
    createdAt: existing.createdAt || now,
    timeline: [
      ...(existing.timeline ?? []),
      {
        id: `${Date.now()}`,
        applicationId: input.jobId,
        type: snapshot.exists() ? "updated" : "created",
        timestamp: now,
        details: input.timelineNote,
        status: input.status,
        note: input.timelineNote,
      },
    ],
  };

  await setDoc(docRef, updated, { merge: true });
  return updated;
}

export async function loadApplicationPackage(uid: string, jobId: string): Promise<ApplicationPackage> {
  const packageService = createApplicationPackageService();
  const storedPackage = await packageService.getApplicationPackage(uid, jobId);
  if (!storedPackage) {
    throw new Error("Application package not found.");
  }

  if (!storedPackage.job) {
    throw new Error("Application package missing job metadata.");
  }

  if (!storedPackage.tailoredResume) {
    throw new Error("Application package missing tailored resume.");
  }

  return {
    application: {
      id: storedPackage.id,
      userId: storedPackage.userId,
      jobId: storedPackage.id,
      status: storedPackage.status === "draft" ? ApplicationStatus.NOT_APPLIED : (storedPackage.status as ApplicationStatus),
      createdAt: storedPackage.generatedAt,
      updatedAt: storedPackage.updatedAt,
      resumeVersion: storedPackage.tailoredResume.versionLabel,
      coverLetterVersion: storedPackage.coverLetter?.versionLabel,
      appliedAt: storedPackage.status === "submitted" ? storedPackage.updatedAt : undefined,
    },
    coverLetter: storedPackage.coverLetter
      ? {
          versionLabel: storedPackage.coverLetter.versionLabel,
          content: storedPackage.coverLetter.content,
          pdfUrl: storedPackage.coverLetter.pdfUrl,
        }
      : null,
    job: {
      id: storedPackage.job.id,
      title: storedPackage.job.title,
      company: storedPackage.job.company,
      location: storedPackage.job.location || "",
      salary: storedPackage.job.salary || "",
      description: storedPackage.job.description,
      applyUrl: storedPackage.job.applyUrl || "",
      source: storedPackage.job.source || "",
      scrapedAt: storedPackage.generatedAt,
    },
    match: storedPackage.match ?? null,
    tailoredResume: {
      versionLabel: storedPackage.tailoredResume.versionLabel,
      content: storedPackage.tailoredResume.profile,
      pdfUrl: storedPackage.tailoredResume.pdfUrl,
      diff: storedPackage.tailoredResume.diff,
    },
  };
}
