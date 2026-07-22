import { doc, getDocs, orderBy, query, setDoc } from "firebase/firestore";

import { COLLECTIONS, getJobsCollection, isFirebaseConfigured, getDb } from "@/lib/firebase";
import { createJobDuplicateKey } from "@/services/collector/normalize";
import type { JobPosting } from "@/types/job";

export async function saveCollectedJobs(jobs: JobPosting[]) {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase environment variables are missing.");
  }

  const existingJobs = await getStoredJobs();
  const seen = new Set(existingJobs.map((job) => createJobDuplicateKey(job)));
  let added = 0;
  let skipped = 0;

  for (const job of jobs) {
    const duplicateKey = createJobDuplicateKey(job);

    if (seen.has(duplicateKey)) {
      skipped += 1;
      continue;
    }

    seen.add(duplicateKey);
    await setDoc(doc(getDb(), COLLECTIONS.jobs, job.id), job);
    added += 1;
  }

  return { added, skipped };
}

export async function getStoredJobs(): Promise<JobPosting[]> {
  if (!isFirebaseConfigured()) {
    return [];
  }

  const snapshot = await getDocs(query(getJobsCollection(), orderBy("scrapedAt", "desc")));
  return snapshot.docs.map((document) => document.data());
}
