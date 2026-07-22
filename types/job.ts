export interface JobPosting {
  id: string;
  title: string;
  company: string;
  location: string;
  salary?: string;
  description: string;
  applyUrl: string;
  source: string;
  scrapedAt: string;
}
