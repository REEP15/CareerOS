import { NextResponse } from "next/server";
import { deleteUser } from "firebase/auth";
import { collection, getDocs, writeBatch } from "firebase/firestore";

import { getAuth, getDb, isFirebaseConfigured } from "@/shared/lib/firebase";
import { verifyAuthToken } from "@/shared/lib/server-auth";
import { USER_COLLECTIONS } from "@/shared/lib/firebase";

export async function POST(request: Request) {
  try {
    const authResult = await verifyAuthToken(request);

    if (!authResult) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!isFirebaseConfigured()) {
      return NextResponse.json({ success: false, error: "Firebase not configured" }, { status: 500 });
    }

    const uid = authResult.uid;
    const db = getDb();

    // Delete all user data from Firestore
    const batch = writeBatch(db);

    // Delete all documents in each user collection
    const collectionsToDelete = [
      USER_COLLECTIONS.settings,
      USER_COLLECTIONS.apiKeys,
      USER_COLLECTIONS.missions,
      USER_COLLECTIONS.jobs,
      USER_COLLECTIONS.matches,
      USER_COLLECTIONS.resume,
      USER_COLLECTIONS.applications,
      USER_COLLECTIONS.tailoredResumes,
      USER_COLLECTIONS.coverLetters,
      USER_COLLECTIONS.notifications,
    ];

    for (const collectionName of collectionsToDelete) {
      const collectionPath = `users/${uid}/${collectionName}`;
      const snapshot = await getDocs(collection(db, collectionPath));

      for (const document of snapshot.docs) {
        batch.delete(document.ref);
      }
    }

    await batch.commit();

    // Delete Firebase Auth user - need to get the actual user object
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
      await deleteUser(user);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete account",
      },
      { status: 500 },
    );
  }
}
