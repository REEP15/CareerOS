import type { JobPosting } from "@/types/job";
import type { MatchResult } from "@/types/match";
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

export type ResumeTailoringContext = {
  prompt: string;
  resume: ResumeProfile;
  job: JobPosting;
  match: MatchResult | null;
};

export interface ResumeTailoringProvider {
  tailorResume(context: ResumeTailoringContext): Promise<string | null>;
}

export type CoverLetterContext = {
  prompt: string;
  resume: ResumeProfile;
  job: JobPosting;
  match: MatchResult | null;
};

export interface CoverLetterProvider {
  generateCoverLetter(context: CoverLetterContext): Promise<string | null>;
}

type AIProviderRegistry = {
  resumeExtraction: ResumeExtractionProvider | null;
  jobMatch: JobMatchProvider | null;
  resumeTailoring: ResumeTailoringProvider | null;
  coverLetter: CoverLetterProvider | null;
};

const providers: AIProviderRegistry = {
  resumeExtraction: null,
  jobMatch: null,
  resumeTailoring: null,
  coverLetter: null,
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

export function registerResumeTailoringProvider(nextProvider: ResumeTailoringProvider) {
  providers.resumeTailoring = nextProvider;
}

export function getResumeTailoringProvider() {
  return providers.resumeTailoring;
}

export function registerCoverLetterProvider(nextProvider: CoverLetterProvider) {
  providers.coverLetter = nextProvider;
}

export function getCoverLetterProvider() {
  return providers.coverLetter;
}
