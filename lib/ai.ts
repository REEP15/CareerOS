import type { ResumeProfile } from "@/types/resume";

export type ResumeExtractionContext = {
  extractedText: string;
};

export interface ResumeExtractionProvider {
  extractResumeProfile(context: ResumeExtractionContext): Promise<ResumeProfile | null>;
}

let provider: ResumeExtractionProvider | null = null;

export function registerResumeExtractionProvider(nextProvider: ResumeExtractionProvider) {
  provider = nextProvider;
}

export function getResumeExtractionProvider() {
  return provider;
}
