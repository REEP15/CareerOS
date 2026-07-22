import type { JobPosting } from "@/types/job";

export interface JobCollector {
  name: string;
  collect(): Promise<JobPosting[]>;
}

export type CollectorJobInput = {
  title: string;
  company: string;
  location: string;
  salary?: string;
  description: string;
  applyUrl: string;
  source?: string;
  scrapedAt?: string;
};
