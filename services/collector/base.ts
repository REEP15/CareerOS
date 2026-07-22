import type { JobCollector } from "@/types/collector";
import type { JobPosting } from "@/types/job";

import { normalizeJob } from "@/services/collector/normalize";
import type { CollectorJobInput } from "@/types/collector";

export abstract class BaseCollector implements JobCollector {
  abstract name: string;

  abstract collect(): Promise<JobPosting[]>;

  protected normalizeJobs(jobs: CollectorJobInput[]) {
    return jobs.map((job) => normalizeJob(job, this.name));
  }
}
