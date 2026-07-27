import { getStoredJobs } from "@/services/collector/save";
import { getStoredMatches } from "@/services/matcher/matcher";
import { getMissions } from "@/services/missions/missions";
import { loadPrimaryResumeProfile } from "@/services/matcher/matcher";

export type SearchResultType = "job" | "company" | "skill" | "mission";

export type SearchResult = {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle: string;
  link: string;
  score: number;
};

export async function globalSearch(uid: string, query: string, limit = 20): Promise<SearchResult[]> {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery || normalizedQuery.length < 2) {
    return [];
  }

  const [jobs, matches, missions, resume] = await Promise.all([
    getStoredJobs(uid),
    getStoredMatches(uid),
    getMissions(uid),
    loadPrimaryResumeProfile(uid),
  ]);

  const results: SearchResult[] = [];

  for (const job of jobs) {
    const match = matches.find((m) => m.jobId === job.id);
    const jobText = `${job.title} ${job.company} ${job.location} ${job.description}`.toLowerCase();
    const score = computeRelevanceScore(jobText, normalizedQuery);

    if (score > 0) {
      results.push({
        id: job.id,
        type: "job",
        title: job.title,
        subtitle: `${job.company} · ${match ? `${match.overallScore}% match` : job.location}`,
        link: `/jobs/${job.id}`,
        score: score + (match?.overallScore ?? 0) * 0.01,
      });
    }

    const companyScore = computeRelevanceScore(job.company.toLowerCase(), normalizedQuery);

    if (companyScore > 0 && !results.some((r) => r.type === "company" && r.title === job.company)) {
      results.push({
        id: `company-${job.company}`,
        type: "company",
        title: job.company,
        subtitle: `${jobs.filter((j) => j.company === job.company).length} jobs`,
        link: `/jobs?company=${encodeURIComponent(job.company)}`,
        score: companyScore,
      });
    }
  }

  const allSkills = new Set<string>();

  if (resume) {
    for (const skill of resume.skills) {
      allSkills.add(skill);
    }
  }

  for (const match of matches) {
    for (const skill of match.missingSkills) {
      allSkills.add(skill);
    }
  }

  for (const skill of allSkills) {
    const score = computeRelevanceScore(skill.toLowerCase(), normalizedQuery);

    if (score > 0) {
      const matchingJobs = jobs.filter((job) =>
        `${job.title} ${job.description}`.toLowerCase().includes(skill.toLowerCase()),
      );

      results.push({
        id: `skill-${skill}`,
        type: "skill",
        title: skill,
        subtitle: `${matchingJobs.length} related jobs`,
        link: `/jobs?skill=${encodeURIComponent(skill)}`,
        score,
      });
    }
  }

  for (const mission of missions) {
    const missionText = `${mission.name} ${mission.keywords.join(" ")} ${mission.locations.join(" ")}`.toLowerCase();
    const score = computeRelevanceScore(missionText, normalizedQuery);

    if (score > 0) {
      results.push({
        id: mission.id,
        type: "mission",
        title: mission.name,
        subtitle: mission.active ? "Active mission" : "Inactive mission",
        link: `/missions/${mission.id}`,
        score,
      });
    }
  }

  return results.sort((left, right) => right.score - left.score).slice(0, limit);
}

function computeRelevanceScore(text: string, query: string): number {
  if (text.includes(query)) {
    return query.length / text.length + 1;
  }

  const queryWords = query.split(/\s+/).filter(Boolean);
  const matchedWords = queryWords.filter((word) => text.includes(word));

  if (matchedWords.length === 0) {
    return 0;
  }

  return matchedWords.length / queryWords.length;
}
