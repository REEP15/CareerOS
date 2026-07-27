import { doc, getDoc, setDoc } from "firebase/firestore";

import { getUserApiKeysCollection, getDb, isFirebaseConfigured } from "@/lib/firebase";
import type { ApiKeyStorage, ApiKeyProvider } from "@/types/api-keys";

const API_KEYS_DOC_ID = "user";

export async function getApiKeys(uid: string): Promise<ApiKeyStorage> {
  if (!isFirebaseConfigured()) {
    return {};
  }

  const snapshot = await getDoc(doc(getUserApiKeysCollection(uid), API_KEYS_DOC_ID));

  if (!snapshot.exists()) {
    return {};
  }

  return snapshot.data() as ApiKeyStorage;
}

export async function getApiKey(uid: string, provider: ApiKeyProvider): Promise<string | undefined> {
  const apiKeys = await getApiKeys(uid);
  return apiKeys[provider];
}

export async function saveApiKey(uid: string, provider: ApiKeyProvider, apiKey: string): Promise<void> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase environment variables are missing.");
  }

  const existing = await getApiKeys(uid);
  const updated: ApiKeyStorage = {
    ...existing,
    [provider]: apiKey,
  };

  await setDoc(doc(getUserApiKeysCollection(uid), API_KEYS_DOC_ID), updated);
}

export async function hasApiKey(uid: string, provider: ApiKeyProvider): Promise<boolean> {
  const apiKey = await getApiKey(uid, provider);
  return Boolean(apiKey);
}
