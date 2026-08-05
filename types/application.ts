import type { ResumeProfile } from "./resume";

/**
 * Application Package - Contains all generated artifacts for a single job application
 */
export interface ApplicationPackage {
  id: string; // Job ID serves as package ID
  userId: string;
  
  // Job metadata
  job: {
    id: string;
    title: string;
    company: string;
    description: string;
    location?: string;
    salary?: string;
    url?: string;
  };
  
  // Generated artifacts
  tailoredResume: {
    id: string;
    content: ResumeProfile;
    generatedAt: string;
  };
  
  coverLetter: {
    content: string;
    generatedAt: string;
    editedAt?: string;
  };
  
  atsAnalysis: {
    originalScore: number;
    tailoredScore: number;
    keywordCoverage: number;
    matchedKeywords: string[];
    missingKeywords: string[];
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
    analysis: string;
  };
  
  // References
  originalResumeId: string;
  
  // Metadata
  status: "draft" | "reviewed" | "submitted";
  generatedAt: string;
  updatedAt: string;
}

/**
 * Application status type (for existing code compatibility)
 */
export enum ApplicationStatus {
  NOT_APPLIED = "not_applied",
  PREPARING = "preparing",
  READY = "ready",
  APPLIED = "applied",
  DRAFT = "draft",
  REVIEWED = "reviewed",
  SUBMITTED = "submitted",
  APPLYING = "applying",
  REVIEW_REQUIRED = "review_required",
  INTERVIEW = "interview",
  OFFER = "offer",
  REJECTED = "rejected",
}

/**
 * Application status labels (for existing code compatibility)
 */
export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  not_applied: "Not Applied",
  preparing: "Preparing",
  ready: "Ready",
  applied: "Applied",
  draft: "Draft",
  reviewed: "Reviewed",
  submitted: "Submitted",
  applying: "Applying",
  review_required: "Review Required",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
};

/**
 * Application type (for existing code compatibility)
 */
export interface Application {
  id: string;
  userId: string;
  jobId: string;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
  resumeVersion?: string;
  coverLetterVersion?: string;
  appliedAt?: string;
  notes?: string;
  timeline?: ApplicationTimelineEvent[];
}

/**
 * Application timeline event (for existing code compatibility)
 */
export interface ApplicationTimelineEvent {
  id: string;
  applicationId: string;
  type: "created" | "updated" | "submitted" | "failed";
  timestamp: string;
  details?: string;
  status?: ApplicationStatus | string;
  note?: string;
}

/**
 * Tailoring options
 */
export interface TailoringOptions {
  optimizeForATS?: boolean;
  emphasizeRecentExperience?: boolean;
  compressContent?: boolean;
  targetKeywords?: string[];
}

/**
 * Cover letter options
 */
export interface CoverLetterOptions {
  tone?: "professional" | "enthusiastic" | "confident";
  length?: "short" | "medium" | "long";
  highlightExperience?: boolean;
}

/**
 * ATS analysis options
 */
export interface ATSAnalysisOptions {
  checkKeywordDensity?: boolean;
  analyzeSectionCompleteness?: boolean;
  compareOriginalVsTailored?: boolean;
}