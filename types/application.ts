export enum ApplicationStatus {
  NOT_APPLIED = "NOT_APPLIED",
  PREPARING = "PREPARING",
  READY = "READY",
  APPLYING = "APPLYING",
  REVIEW_REQUIRED = "REVIEW_REQUIRED",
  APPLIED = "APPLIED",
  INTERVIEW = "INTERVIEW",
  REJECTED = "REJECTED",
  OFFER = "OFFER",
}

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  [ApplicationStatus.NOT_APPLIED]: "Not Applied",
  [ApplicationStatus.PREPARING]: "Preparing",
  [ApplicationStatus.READY]: "Ready",
  [ApplicationStatus.APPLYING]: "Applying",
  [ApplicationStatus.REVIEW_REQUIRED]: "Review Required",
  [ApplicationStatus.APPLIED]: "Applied",
  [ApplicationStatus.INTERVIEW]: "Interview",
  [ApplicationStatus.REJECTED]: "Rejected",
  [ApplicationStatus.OFFER]: "Offer",
};

export interface ApplicationTimelineEvent {
  status: ApplicationStatus;
  timestamp: string;
  note?: string;
}

export interface Application {
  id: string;
  jobId: string;
  status: ApplicationStatus;
  resumeVersion?: string;
  coverLetterVersion?: string;
  appliedAt?: string;
  updatedAt?: string;
  notes?: string;
  timeline?: ApplicationTimelineEvent[];
}
