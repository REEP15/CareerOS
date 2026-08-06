import type { MatchResult } from "@/types/match";

const MATCH_WEIGHTS = {
  skillsScore: 0.4,
  experienceScore: 0.3,
  educationScore: 0.1,
  locationScore: 0.1,
  salaryScore: 0.1,
} as const;

export function calculateOverallScore(
  scores: Pick<
    MatchResult,
    "skillsScore" | "experienceScore" | "educationScore" | "locationScore" | "salaryScore"
  >,
) {
  const weightedTotal =
    scores.skillsScore * MATCH_WEIGHTS.skillsScore +
    scores.experienceScore * MATCH_WEIGHTS.experienceScore +
    scores.educationScore * MATCH_WEIGHTS.educationScore +
    scores.locationScore * MATCH_WEIGHTS.locationScore +
    scores.salaryScore * MATCH_WEIGHTS.salaryScore;

  return clampScore(weightedTotal);
}

export function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}
