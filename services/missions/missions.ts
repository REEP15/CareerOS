import { doc, getDoc, setDoc, deleteDoc, getDocs, query, orderBy } from "firebase/firestore";

import { getUserMissionsCollection, getDb, isFirebaseConfigured } from "@/shared/lib/firebase";
import type { Mission, MissionInput } from "@/shared/types/mission";

export async function getMissions(uid: string): Promise<Mission[]> {
  if (!isFirebaseConfigured()) {
    return [];
  }

  const snapshot = await getDocs(query(getUserMissionsCollection(uid), orderBy("updatedAt", "desc")));
  return snapshot.docs.map((document) => document.data());
}

export async function getActiveMissions(uid: string): Promise<Mission[]> {
  const missions = await getMissions(uid);
  return missions.filter((mission) => mission.active);
}

export async function getMission(uid: string, id: string): Promise<Mission | null> {
  if (!isFirebaseConfigured()) {
    return null;
  }

  const snapshot = await getDoc(doc(getUserMissionsCollection(uid), id));
  return snapshot.exists() ? (snapshot.data() as Mission) : null;
}

export async function createMission(uid: string, input: MissionInput): Promise<Mission> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase environment variables are missing.");
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const mission: Mission = {
    ...input,
    id,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(doc(getUserMissionsCollection(uid), id), mission);
  return mission;
}

export async function updateMission(uid: string, id: string, input: Partial<MissionInput>): Promise<Mission> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase environment variables are missing.");
  }

  const existing = await getMission(uid, id);

  if (!existing) {
    throw new Error("Mission not found.");
  }

  const mission: Mission = {
    ...existing,
    ...input,
    id,
    updatedAt: new Date().toISOString(),
  };

  await setDoc(doc(getUserMissionsCollection(uid), id), mission);
  return mission;
}

export async function deleteMission(uid: string, id: string) {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase environment variables are missing.");
  }

  await deleteDoc(doc(getUserMissionsCollection(uid), id));
}

export async function duplicateMission(uid: string, id: string): Promise<Mission> {
  const existing = await getMission(uid, id);

  if (!existing) {
    throw new Error("Mission not found.");
  }

  return createMission(uid, {
    name: `${existing.name} (Copy)`,
    keywords: [...existing.keywords],
    excludedKeywords: [...existing.excludedKeywords],
    locations: [...existing.locations],
    remote: existing.remote,
    minimumSalary: existing.minimumSalary,
    minimumMatch: existing.minimumMatch,
    sources: [...existing.sources],
    active: false,
  });
}

export async function setMissionActive(uid: string, id: string, active: boolean) {
  return updateMission(uid, id, { active });
}

export function jobMatchesMission(
  job: { title: string; description: string; location: string; salary?: string; source: string },
  matchScore: number | null,
  mission: Mission,
): boolean {
  if (!mission.active) {
    return false;
  }

  const text = `${job.title} ${job.description}`.toLowerCase();

  if (mission.sources.length > 0 && !mission.sources.some((source) => source.toLowerCase() === job.source.toLowerCase())) {
    return false;
  }

  if (mission.keywords.length > 0 && !mission.keywords.some((keyword) => text.includes(keyword.toLowerCase()))) {
    return false;
  }

  if (mission.excludedKeywords.some((keyword) => text.includes(keyword.toLowerCase()))) {
    return false;
  }

  if (mission.locations.length > 0) {
    const jobLocation = job.location.toLowerCase();
    const locationMatch = mission.locations.some((location) => jobLocation.includes(location.toLowerCase()));

    if (!locationMatch && !(mission.remote && jobLocation.includes("remote"))) {
      return false;
    }
  }

  if (mission.remote && !job.location.toLowerCase().includes("remote")) {
    return false;
  }

  if (mission.minimumMatch > 0 && (matchScore ?? 0) < mission.minimumMatch) {
    return false;
  }

  if (mission.minimumSalary && job.salary) {
    const salaryNumber = extractSalaryNumber(job.salary);

    if (salaryNumber !== null && salaryNumber < mission.minimumSalary) {
      return false;
    }
  }

  return true;
}

function extractSalaryNumber(salary: string): number | null {
  const match = /(\d[\d,]*)/.exec(salary.replace(/,/g, ""));

  if (!match) {
    return null;
  }

  return Number.parseInt(match[1].replace(/,/g, ""), 10);
}

export function filterJobsByMissions<T extends { title: string; description: string; location: string; salary?: string; source: string }>(
  jobs: T[],
  missions: Mission[],
  matchScores: Map<string, number>,
): T[] {
  const activeMissions = missions.filter((mission) => mission.active);

  if (activeMissions.length === 0) {
    return jobs;
  }

  return jobs.filter((job) => {
    const jobWithId = job as T & { id?: string };
    const score = jobWithId.id ? matchScores.get(jobWithId.id) ?? null : null;
    return activeMissions.some((mission) => jobMatchesMission(job, score, mission));
  });
}
