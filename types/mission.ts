export interface Mission {
  id: string;
  name: string;
  keywords: string[];
  locations: string[];
  minimumSalary?: number;
  remote: boolean;
}
