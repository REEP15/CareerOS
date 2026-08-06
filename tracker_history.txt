import { doc, getDoc, getDocs, setDoc } from "firebase/firestore";

import { getUserApplicationsCollection, getUserJobsCollection, getUserMatchesCollection, getDb, isFirebaseConfigured } from "@/lib/firebase";
import { ApplicationStatus, type Application, type ApplicationTimelineEvent } from "@/types/application";
import type { JobPosting } from "@/types/job";
import type { MatchResult } from "@/types/match";
import { createApplicationPackageService } from "@/services/tailoring/package";
import type { ApplicationPackage as NewApplicationPackage } from "@/types/application";

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
    content: any;
    pdfUrl?: string;
    diff: {
      summary: {
        before: string;
        after: string;
      };
      skills: {
        before: string[];
        after: string[];
      };
      experience: {
        before: string[];
        after: string[];
      };
    };
  } | null;
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

  const packageService = createApplicationPackageService();
  const pkg = await packageService.getApplicationPackage(uid, jobId);
  
  if (!pkg) {
    return null;
  }

  return {
    id: pkg.id,
    userId: pkg.userId,
    jobId: pkg.id,
    status: pkg.status === "draft" ? ApplicationStatus.NOT_APPLIED : pkg.status as ApplicationStatus,
    resumeVersion: pkg.tailoredResume.id,
    coverLetterVersion: pkg.coverLetter.editedAt || pkg.coverLetter.generatedAt,
    appliedAt: pkg.status === "submitted" ? pkg.updatedAt : undefined,
    updatedAt: pkg.updatedAt,
    createdAt: pkg.generatedAt,
    notes: "",
    timeline: [
      {
        id: `${Date.now()}`,
        applicationId: pkg.id,
        type: "created",
        timestamp: pkg.generatedAt,
        details: "Application package created",
        status: pkg.status,
        note: "",
      },
    ],
  };
}

export async function getStoredApplications(uid: string) {
  if (!isFirebaseConfigured()) {
    return [];
  }

  const packageService = createApplicationPackageService();
  const packages = await packageService.listApplicationPackages(uid);
  
  return packages.map((pkg: NewApplicationPackage) => ({
    id: pkg.id,
    userId: pkg.userId,
    jobId: pkg.id,
    status: pkg.status === "draft" ? ApplicationStatus.NOT_APPLIED : pkg.status as ApplicationStatus,
    resumeVersion: pkg.tailoredResume.id,
    coverLetterVersion: pkg.coverLetter.editedAt || pkg.coverLetter.generatedAt,
    appliedAt: pkg.status === "submitted" ? pkg.updatedAt : undefined,
    updatedAt: pkg.updatedAt,
    createdAt: pkg.generatedAt,
    notes: "",
    timeline: [
      {
        id: `${Date.now()}`,
        applicationId: pkg.id,
        type: "created",
        timestamp: pkg.generatedAt,
        details: "Application package created",
        status: pkg.status,
        note: "",
      },
    ],
  }));
}

function normalizeApplication(application: Application): Application {
  return {
    ...application,
    status: application.status ?? ApplicationStatus.NOT_APPLIED,
    timeline: application.timeline ?? [],
  };
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

  const packageService = createApplicationPackageService();
  // Map old status to new status
  const newStatus = input.status === ApplicationStatus.NOT_APPLIED ? "draft" : input.status as any;
  await packageService.updatePackageStatus(uid, input.jobId, newStatus);

  return {
    id: input.jobId,
    userId: uid,
    jobId: input.jobId,
    status: input.status,
    resumeVersion: input.resumeVersion,
    coverLetterVersion: input.coverLetterVersion,
    appliedAt: input.status === ApplicationStatus.APPLIED ? new Date().toISOString() : undefined,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    notes: input.notes,
    timeline: [
      {
        id: `${Date.now()}`,
        applicationId: input.jobId,
        type: "updated",
        timestamp: new Date().toISOString(),
        details: input.timelineNote,
        status: input.status,
        note: input.timelineNote,
      },
    ],
  };
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

  const packageService = createApplicationPackageService();
  const newPackage = await packageService.getApplicationPackage(uid, jobId);
  
  if (!newPackage) {
    throw new Error("Application package not found.");
  }

  const [jobSnapshot, matchSnapshot] = await Promise.all([
    getDoc(doc(getUserJobsCollection(uid), jobId)),
    getDoc(doc(getUserMatchesCollection(uid), jobId)),
  ]);

  if (!jobSnapshot.exists()) {
    throw new Error("Job not found.");
  }

  return {
    application: {
      id: newPackage.id,
      userId: newPackage.userId,
      jobId: newPackage.id,
      status: newPackage.status === "draft" ? ApplicationStatus.NOT_APPLIED : newPackage.status as ApplicationStatus,
      resumeVersion: newPackage.tailoredResume.id,
      coverLetterVersion: newPackage.coverLetter.editedAt || newPackage.coverLetter.generatedAt,
      appliedAt: newPackage.status === "submitted" ? newPackage.updatedAt : undefined,
      updatedAt: newPackage.updatedAt,
      createdAt: newPackage.generatedAt,
      notes: "",
      timeline: [
        {
          id: `${Date.now()}`,
          applicationId: newPackage.id,
          type: "created",
          timestamp: newPackage.generatedAt,
          details: "Application package created",
          status: newPackage.status,
          note: "",
        },
      ],
    },
    coverLetter: {
      versionLabel: newPackage.coverLetter.editedAt || newPackage.coverLetter.generatedAt,
      content: newPackage.coverLetter.content,
      pdfUrl: undefined,
    },
    job: jobSnapshot.data() as JobPosting,
    match: matchSnapshot.exists() ? (matchSnapshot.data() as MatchResult) : null,
    tailoredResume: {
      versionLabel: newPackage.tailoredResume.id,
      content: newPackage.tailoredResume.content,
      diff: {
        summary: {
          before: "Original resume",
          after: "Tailored resume",
        },
        skills: {
          before: newPackage.tailoredResume.content.skills || [],
          after: newPackage.tailoredResume.content.skills || [],
        },
        experience: {
          before: newPackage.tailoredResume.content.experience?.map((e: any) => e.company) || [],
          after: newPackage.tailoredResume.content.experience?.map((e: any) => e.company) || [],
        },
      },
    },
  };
}
