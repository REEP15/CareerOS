import { collection, getDocs, query, where } from "firebase/firestore";
import { getDb } from "@/shared/lib/firebase";
import type { JobPosting } from "@/shared/types/job";

export async function getStoredJobs(uid: string): Promise<JobPosting[]> {
  const db = getDb();
  const jobsRef = collection(db, "users", uid, "jobs");
  const q = query(jobsRef, where("source", "==", "manual"));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as JobPosting));
}

export async function saveCollectedJobs(uid: string, jobs: JobPosting[]): Promise<{ added: number; skipped: number }> {
  return { added: 0, skipped: 0 };
}
