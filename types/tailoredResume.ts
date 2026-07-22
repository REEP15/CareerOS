import type { ResumeProfile } from "@/types/resume";

export type ResumeDiff = {
  summary: {
    before: string;
    after: string;
  };
  skills: {
    before: string[];
    after: string[];
  };
  prioritizedProjects: string[];
  keywordOptimizations: string[];
};

export interface TailoredResume {
  id: string;
  jobId: string;
  version: number;
  versionLabel: string;
  profile: ResumeProfile;
  diff: ResumeDiff;
  pdfUrl: string;
  createdAt: string;
}
