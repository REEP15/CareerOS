import { doc, getDoc, setDoc } from "firebase/firestore";

import { getApiKeysCollection, getDb, isFirebaseConfigured } from "@/lib/firebase";
import type { ApiKeyStorage, ApiKeyProvider } from "@/types/api-keys";

const API_KEYS_DOC_ID = "user";

export async function getApiKeys(): Promise<ApiKeyStorage> {
  if (!isFirebaseConfigured()) {
    return {};
  }

  const snapshot = await getDoc(doc(getDb(), "apiKeys", API_KEYS_DOC_ID));

  if (!snapshot.exists()) {
    return {};
  }

  return snapshot.data() as ApiKeyStorage;
}

export async function getApiKey(provider: ApiKeyProvider): Promise<string | undefined> {
  const apiKeys = await getApiKeys();
  return apiKeys[provider];
}

export async function saveApiKey(provider: ApiKeyProvider, apiKey: string): Promise<void> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase environment variables are missing.");
  }

  const existing = await getApiKeys();
  const updated: ApiKeyStorage = {
    ...existing,
    [provider]: apiKey,
  };

  await setDoc(doc(getApiKeysCollection(), API_KEYS_DOC_ID), updated);
}

export async function hasApiKey(provider: ApiKeyProvider): Promise<boolean> {
  const apiKey = await getApiKey(provider);
  return Boolean(apiKey);
}
