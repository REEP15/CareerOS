import { doc, getDoc, setDoc } from "firebase/firestore";

import { getUserSettingsCollection, getDb, isFirebaseConfigured, isFirebaseConfigured as checkFirebase } from "@/shared/lib/firebase";
import { DEFAULT_SETTINGS, type AppSettings } from "@/shared/types/settings";

const SETTINGS_DOC_ID = "primary";

export async function getSettings(uid: string): Promise<AppSettings> {
  if (!isFirebaseConfigured()) {
    return {
      id: SETTINGS_DOC_ID,
      ...DEFAULT_SETTINGS,
      firebaseConfigured: false,
      updatedAt: new Date().toISOString(),
    };
  }

  const snapshot = await getDoc(doc(getUserSettingsCollection(uid), SETTINGS_DOC_ID));

  if (!snapshot.exists()) {
    return {
      id: SETTINGS_DOC_ID,
      ...DEFAULT_SETTINGS,
      firebaseConfigured: checkFirebase(),
      updatedAt: new Date().toISOString(),
    };
  }

  const data = snapshot.data() as AppSettings;
  return {
    ...data,
    firebaseConfigured: checkFirebase(),
  };
}

export async function saveSettings(uid: string, input: Partial<Omit<AppSettings, "id" | "updatedAt" | "firebaseConfigured">>) {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase environment variables are missing.");
  }

  const existing = await getSettings(uid);
  const settings: AppSettings = {
    ...existing,
    ...input,
    id: SETTINGS_DOC_ID,
    firebaseConfigured: checkFirebase(),
    updatedAt: new Date().toISOString(),
  };

  await setDoc(doc(getUserSettingsCollection(uid), SETTINGS_DOC_ID), settings);
  return settings;
}
