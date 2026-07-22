export interface MatchResult {
  jobId: string;
  overallScore: number;
  confidence: number;
  skillsScore: number;
  experienceScore: number;
  educationScore: number;
  locationScore: number;
  salaryScore: number;
  strengths: string[];
  weaknesses: string[];
  missingSkills: string[];
  reasoning: string;
  recommended: boolean;
  createdAt: string;
}
