import { doc, setDoc, getDoc, collection, getDocs } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { createResumeTailor } from "./tailor";
import { createCoverLetterGenerator } from "../cover-letter/generator";
import { createATSAnalyzer } from "../ats/analyzer";
import type { ResumeProfile } from "@/types/resume";
import type { ApplicationPackage, TailoringOptions, CoverLetterOptions, ATSAnalysisOptions } from "@/types/application";

/**
 * Application Package Orchestrator
 * Creates complete application packages containing tailored resume, cover letter, and ATS analysis
 */
export class ApplicationPackageService {
  private resumeTailor = createResumeTailor();
  private coverLetterGenerator = createCoverLetterGenerator();
  private atsAnalyzer = createATSAnalyzer();
  
  /**
   * Creates a complete application package for a job
   */
  async createApplicationPackage(
    originalResume: ResumeProfile,
    job: {
      id: string;
      title: string;
      company: string;
      description: string;
      location?: string;
      salary?: string;
      url?: string;
    },
    options?: {
      tailoring?: TailoringOptions;
      coverLetter?: CoverLetterOptions;
      ats?: ATSAnalysisOptions;
    }
  ): Promise<ApplicationPackage> {
    const userId = originalResume.id; // Use resume ID as user context
    
    // 1. Generate tailored resume
    const tailoredResume = await this.resumeTailor.tailorResume(
      originalResume,
      job.description,
      { title: job.title, company: job.company },
      options?.tailoring || {}
    );
    
    // 2. Generate cover letter
    const coverLetter = await this.coverLetterGenerator.generateCoverLetter(
      originalResume,
      job.description,
      { title: job.title, company: job.company },
      options?.coverLetter || {}
    );
    
    // 3. Perform ATS analysis
    const atsAnalysis = await this.atsAnalyzer.analyzeATS(
      originalResume,
      tailoredResume,
      job.description,
      options?.ats || {}
    );
    
    // 4. Create application package
    const applicationPackage: ApplicationPackage = {
      id: job.id,
      userId,
      job,
      tailoredResume: {
        id: `tailored-${job.id}`,
        content: tailoredResume,
        generatedAt: new Date().toISOString(),
      },
      coverLetter: {
        content: coverLetter,
        generatedAt: new Date().toISOString(),
      },
      atsAnalysis,
      originalResumeId: originalResume.id,
      status: "draft",
      generatedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // 5. Store in Firestore
    await this.saveApplicationPackage(applicationPackage);
    
    return applicationPackage;
  }
  
  /**
   * Saves application package to Firestore
   */
  public async saveApplicationPackage(pkg: ApplicationPackage): Promise<void> {
    const packageRef = doc(getDb(), `users/${pkg.userId}/application-packages/${pkg.id}`);
    await setDoc(packageRef, pkg);
  }
  
  /**
   * Retrieves an application package by ID
   */
  async getApplicationPackage(userId: string, packageId: string): Promise<ApplicationPackage | null> {
    const packageRef = doc(getDb(), `users/${userId}/application-packages/${packageId}`);
    const snapshot = await getDoc(packageRef);
    
    if (!snapshot.exists()) {
      return null;
    }
    
    return snapshot.data() as ApplicationPackage;
  }
  
  /**
   * Updates application package status
   */
  async updatePackageStatus(
    userId: string,
    packageId: string,
    status: "draft" | "reviewed" | "submitted"
  ): Promise<void> {
    const packageRef = doc(getDb(), `users/${userId}/application-packages/${packageId}`);
    await setDoc(packageRef, { status, updatedAt: new Date().toISOString() }, { merge: true });
  }
  
  /**
   * Updates cover letter in application package
   */
  async updateCoverLetter(
    userId: string,
    packageId: string,
    editedContent: string
  ): Promise<void> {
    const packageRef = doc(getDb(), `users/${userId}/application-packages/${packageId}`);
    await setDoc(packageRef, {
      coverLetter: {
        content: editedContent,
        generatedAt: new Date().toISOString(), // Keep original generation time
        editedAt: new Date().toISOString(),
      },
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  }
  
  /**
   * Lists all application packages for a user
   */
  async listApplicationPackages(userId: string): Promise<ApplicationPackage[]> {
    const packagesRef = collection(getDb(), `users/${userId}/application-packages`);
    const snapshot = await getDocs(packagesRef);
    const packages: ApplicationPackage[] = [];
    
    snapshot.forEach((doc: any) => {
      packages.push(doc.data() as ApplicationPackage);
    });
    
    return packages.sort((a, b) => 
      new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
    );
  }
}

/**
 * Factory function to create application package service
 */
export function createApplicationPackageService(): ApplicationPackageService {
  return new ApplicationPackageService();
}