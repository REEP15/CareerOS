import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import type { ApplicationPackage } from "@/types/application";

export class ApplicationPackageService {
  async getApplicationPackage(userId: string, packageId: string): Promise<ApplicationPackage | null> {
    const packageRef = doc(getDb(), `users/${userId}/application-packages/${packageId}`);
    const snapshot = await getDoc(packageRef);

    return snapshot.exists() ? (snapshot.data() as ApplicationPackage) : null;
  }

  async saveApplicationPackage(pkg: ApplicationPackage): Promise<void> {
    const packageRef = doc(getDb(), `users/${pkg.userId}/application-packages/${pkg.id}`);
    await setDoc(packageRef, pkg);
  }

  async updatePackageStatus(
    userId: string,
    packageId: string,
    status: "draft" | "reviewed" | "submitted",
  ): Promise<void> {
    const packageRef = doc(getDb(), `users/${userId}/application-packages/${packageId}`);
    await setDoc(packageRef, { status, updatedAt: new Date().toISOString() }, { merge: true });
  }

  async listApplicationPackages(userId: string): Promise<ApplicationPackage[]> {
    const packagesRef = collection(getDb(), `users/${userId}/application-packages`);
    const snapshot = await getDocs(packagesRef);

    return snapshot.docs
      .map((packageDoc) => packageDoc.data() as ApplicationPackage)
      .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
  }
}

export function createApplicationPackageService(): ApplicationPackageService {
  return new ApplicationPackageService();
}
