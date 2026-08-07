import { doc, getDocs, orderBy, query, setDoc } from "firebase/firestore";

import { getUserJobsCollection, isFirebaseConfigured, getDb } from "@/lib/firebase";
import { createJobDuplicateKey } from "../collector/normalize";
import type { JobPosting } from "@/types/job";

export async function saveCollectedJobs(uid: string, jobs: JobPosting[]) {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase environment variables are missing.");
  }

  const existingJobs = await getStoredJobs(uid);
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
    await setDoc(doc(getUserJobsCollection(uid), job.id), job);
    added += 1;
  }

  return { added, skipped };
}

export async function getStoredJobs(uid: string): Promise<JobPosting[]> {
  if (!isFirebaseConfigured()) {
    return [];
  }

  const snapshot = await getDocs(query(getUserJobsCollection(uid), orderBy("scrapedAt", "desc")));
 return snapshot.docs.map(
  (document) => document.data() as JobPosting
)
}
