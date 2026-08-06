import { NextResponse } from "next/server";

import { verifyAuthToken } from "@/shared/lib/server-auth";
import { getDoc, doc } from "firebase/firestore";
import { getUserJobsCollection, getUserMatchesCollection, isFirebaseConfigured } from "@/shared/lib/firebase";
import type { JobPosting } from "@/shared/types/job";
import type { MatchResult } from "@/shared/types/match";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authResult = await verifyAuthToken(request);

    if (!authResult) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const uid = authResult.uid;

    if (!isFirebaseConfigured()) {
      return NextResponse.json({ success: false, error: "Firebase not configured" }, { status: 500 });
    }

    // Get job data
    const jobSnapshot = await getDoc(doc(getUserJobsCollection(uid), id));
    
    if (!jobSnapshot.exists()) {
      return NextResponse.json({ success: false, error: "Job not found" }, { status: 404 });
    }

    const job = jobSnapshot.data() as JobPosting;

    // Get match data if available
    const matchSnapshot = await getDoc(doc(getUserMatchesCollection(uid), id));
    const match = matchSnapshot.exists() ? (matchSnapshot.data() as MatchResult) : null;

    return NextResponse.json({ 
      success: true, 
      job,
      match,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch job",
      },
      { status: 500 },
    );
  }
}
