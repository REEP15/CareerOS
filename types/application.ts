export interface Application {
  id: string;
  jobId: string;
  status: "Not Applied" | "Preparing" | "Ready" | "Applying" | "Applied" | "Interview" | "Rejected" | "Offer";
  resumeVersion?: string;
  coverLetterVersion?: string;
  appliedAt?: string;
  updatedAt?: string;
}
