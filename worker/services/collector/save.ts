import { doc, getDocs, orderBy, query, setDoc } from "firebase/firestore";

import { getUserJobsCollection, isFirebaseConfigured, getDb } from "@/lib/firebase";
import { createJobDuplicateKey } from "../collector/normalize";
import type { JobPosting } from "@/types/job";

// Debug: Log which firebase/firestore module is being used
console.log('[worker/services/collector/save.ts] firebase/firestore module path:', require.resolve('firebase/firestore'));
console.log('[worker/services/collector/save.ts] firebase/app module path:', require.resolve('firebase/app'));

export async function saveCollectedJobs(uid: string, jobs: JobPosting[]) {
  console.log('[worker/services/collector/save.ts] saveCollectedJobs called');
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
    console.log('[worker/services/collector/save.ts] About to call setDoc for job:', job.id);
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
