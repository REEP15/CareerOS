export interface ApiKeyStorage {
  chatgpt?: string;
  gemini?: string;
  deepseek?: string;
}

export type ApiKeyProvider = keyof ApiKeyStorage;
