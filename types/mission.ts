export interface Mission {
  id: string;
  name: string;
  keywords: string[];
  excludedKeywords: string[];
  locations: string[];
  remote: boolean;
  minimumSalary?: number;
  minimumMatch: number;
  sources: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type MissionInput = Omit<Mission, "id" | "createdAt" | "updatedAt">;
