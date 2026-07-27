export interface Experience {
  company: string;
  title: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  highlights: string[];
}

export interface Project {
  name: string;
  description: string;
  technologies: string[];
  link?: string;
}

export interface Education {
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  startDate?: string;
  endDate?: string;
}

export interface ResumeProfile {
  id: string;
  personal: {
    name: string;
    email: string;
    phone: string;
    location: string;
    linkedin?: string;
    github?: string;
    portfolio?: string;
  };
  summary: string;
  skills: string[];
  experience: Experience[];
  projects: Project[];
  education: Education[];
  certifications: string[];
  preferredRoles: string[];
  preferredLocations: string[];
  updatedAt: string;
  // Metadata fields
  storagePath?: string;
  uploadedAt?: string;
  lastParsedAt?: string;
  parserVersion?: string;
  sourceFileName?: string;
  resumeUrl?: string;
}
