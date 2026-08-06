import { createHash } from "node:crypto";

import type { CollectorJobInput } from "@/types/collector";
import type { JobPosting } from "@/types/job";

export function normalizeJob(input: CollectorJobInput, source: string): JobPosting {
  const title = normalizeText(input.title);
  const company = normalizeText(input.company);
  const location = normalizeText(input.location);
  const description = normalizeDescription(input.description);
  const applyUrl = input.applyUrl.trim();
  const normalizedSource = normalizeText(input.source ?? source);
  const salary = input.salary ? normalizeText(input.salary) : undefined;
  const scrapedAt = input.scrapedAt ?? new Date().toISOString();
  const identity = createJobIdentity({ company, title, location });

  return {
    id: identity,
    title,
    company,
    location,
    salary,
    description,
    applyUrl,
    source: normalizedSource,
    scrapedAt,
  };
}

export function createJobIdentity(job: Pick<JobPosting, "company" | "title" | "location">) {
  const canonical = createJobDuplicateKey(job);
  return createHash("sha1").update(canonical).digest("hex");
}

export function createJobDuplicateKey(job: Pick<JobPosting, "company" | "title" | "location">) {
  return [job.company, job.title, job.location]
    .map((value) => value.trim().toLowerCase())
    .join("::");
}

export function dedupeJobs(jobs: JobPosting[]) {
  const seen = new Set<string>();
  const unique: JobPosting[] = [];
  let duplicates = 0;

  for (const job of jobs) {
    const duplicateKey = createJobDuplicateKey(job);

    if (seen.has(duplicateKey)) {
      duplicates += 1;
      continue;
    }

    seen.add(duplicateKey);
    unique.push(job);
  }

  return {
    jobs: unique,
    duplicates,
  };
}

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeDescription(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}
