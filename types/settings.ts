export type AiProviderName = "chatgpt" | "gemini" | "deepseek" | "none";

export interface AppSettings {
  id: string;
  firebaseConfigured: boolean;
  aiProvider: AiProviderName;
  playwrightHeadless: boolean;
  playwrightTimeoutMs: number;
  preferredLocations: string[];
  preferredSalaryMinimum: number;
  theme: "light" | "dark" | "system";
  updatedAt: string;
}

export const DEFAULT_SETTINGS: Omit<AppSettings, "id" | "updatedAt"> = {
  firebaseConfigured: false,
  aiProvider: "none",
  playwrightHeadless: false,
  playwrightTimeoutMs: 60_000,
  preferredLocations: [],
  preferredSalaryMinimum: 0,
  theme: "system",
};
