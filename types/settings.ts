export type AiProviderName = "openai" | "anthropic" | "google" | "none";

export interface AppSettings {
  id: string;
  firebaseConfigured: boolean;
  aiProvider: AiProviderName;
  aiModel: string;
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
  aiModel: "",
  playwrightHeadless: false,
  playwrightTimeoutMs: 60_000,
  preferredLocations: [],
  preferredSalaryMinimum: 0,
  theme: "system",
};
