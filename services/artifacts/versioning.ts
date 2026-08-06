import { collection, getDocs, query, where } from "firebase/firestore";

import {
  USER_COLLECTIONS,
  createArtifactDocId,
  formatVersionLabel,
  getDb,
  isFirebaseConfigured,
} from "@/shared/lib/firebase";

export async function getNextArtifactVersion(uid: string, jobId: string, collectionName: typeof USER_COLLECTIONS.tailoredResumes | typeof USER_COLLECTIONS.coverLetters) {
  if (!isFirebaseConfigured()) {
    return 1;
  }

  const snapshot = await getDocs(
    query(collection(getDb(), `users/${uid}/${collectionName}`), where("jobId", "==", jobId)),
  );

  if (snapshot.empty) {
    return 1;
  }

  const versions = snapshot.docs.map((document) => {
    const data = document.data() as { version?: number };
    return data.version ?? 1;
  });

  return Math.max(...versions) + 1;
}

export function buildArtifactId(jobId: string, version: number) {
  return createArtifactDocId(jobId, version);
}

export function buildVersionLabel(version: number) {
  return formatVersionLabel(version);
}

export function buildVersionedFileName(jobId: string, artifactType: "resume" | "cover-letter", version: number) {
  return `${jobId}-${artifactType}-v${version}.pdf`;
}
