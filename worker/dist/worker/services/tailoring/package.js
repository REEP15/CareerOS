"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplicationPackageService = void 0;
exports.createApplicationPackageService = createApplicationPackageService;
const firestore_1 = require("firebase/firestore");
const firebase_1 = require("@/lib/firebase");
class ApplicationPackageService {
    async getApplicationPackage(userId, packageId) {
        const packageRef = (0, firestore_1.doc)((0, firebase_1.getDb)(), `users/${userId}/application-packages/${packageId}`);
        const snapshot = await (0, firestore_1.getDoc)(packageRef);
        return snapshot.exists() ? snapshot.data() : null;
    }
    async saveApplicationPackage(pkg) {
        const packageRef = (0, firestore_1.doc)((0, firebase_1.getDb)(), `users/${pkg.userId}/application-packages/${pkg.id}`);
        await (0, firestore_1.setDoc)(packageRef, pkg);
    }
    async updatePackageStatus(userId, packageId, status) {
        const packageRef = (0, firestore_1.doc)((0, firebase_1.getDb)(), `users/${userId}/application-packages/${packageId}`);
        await (0, firestore_1.setDoc)(packageRef, { status, updatedAt: new Date().toISOString() }, { merge: true });
    }
    async listApplicationPackages(userId) {
        const packagesRef = (0, firestore_1.collection)((0, firebase_1.getDb)(), `users/${userId}/application-packages`);
        const snapshot = await (0, firestore_1.getDocs)(packagesRef);
        return snapshot.docs
            .map((packageDoc) => packageDoc.data())
            .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
    }
}
exports.ApplicationPackageService = ApplicationPackageService;
function createApplicationPackageService() {
    return new ApplicationPackageService();
}
