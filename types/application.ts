export interface Application {
  id: string;
  jobId: string;
  status: "Not Applied" | "Applied" | "Interview" | "Rejected" | "Offer";
  appliedAt?: string;
}
