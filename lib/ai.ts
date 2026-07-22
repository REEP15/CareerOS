import type { JobPosting } from "@/types/job";
import type { ResumeProfile } from "@/types/resume";

export type ResumeExtractionContext = {
  extractedText: string;
};

export interface ResumeExtractionProvider {
  extractResumeProfile(context: ResumeExtractionContext): Promise<ResumeProfile | null>;
}

export type JobMatchContext = {
  prompt: string;
  resume: ResumeProfile;
  job: JobPosting;
};

export interface JobMatchProvider {
  evaluateJobMatch(context: JobMatchContext): Promise<string | null>;
}

type AIProviderRegistry = {
  resumeExtraction: ResumeExtractionProvider | null;
  jobMatch: JobMatchProvider | null;
};

const providers: AIProviderRegistry = {
  resumeExtraction: null,
  jobMatch: null,
};

export function registerResumeExtractionProvider(nextProvider: ResumeExtractionProvider) {
  providers.resumeExtraction = nextProvider;
}

export function getResumeExtractionProvider() {
  return providers.resumeExtraction;
}

export function registerJobMatchProvider(nextProvider: JobMatchProvider) {
  providers.jobMatch = nextProvider;
}

export function getJobMatchProvider() {
  return providers.jobMatch;
}
