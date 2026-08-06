import type { JobPosting } from "@/types/job";

export enum AutomationMode {
  DISCOVERY_ONLY = "discovery_only",
  FULL_AUTOMATION = "full_automation",
}

export interface JobCollector {
  name: string;
  mode: AutomationMode;
  collect(): Promise<JobPosting[]>;
}

export type CollectorJobInput = {
  title: string;
  company: string;
  location: string;
  salary?: string;
  description: string;
  employmentType?: string;
  experience?: string;
  skills?: string[];
  applyUrl: string;
  source?: string;
  scrapedAt?: string;
};
