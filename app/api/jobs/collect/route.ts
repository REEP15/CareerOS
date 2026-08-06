import { NextResponse } from "next/server";

import { verifyAuthToken } from "@/shared/lib/server-auth";
import { createNotification } from "@/services/notifications/notifications";
import { NotificationType } from "@/shared/types/notification";
import { getActiveMissions } from "@/services/missions/missions";

const WORKER_URL = process.env.WORKER_URL || 'http://localhost:3001';

export async function POST(request: Request) {
  let authResult: { uid: string } | null = null;
  
  try {
    authResult = await verifyAuthToken(request);

    if (!authResult) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const activeMissions = await getActiveMissions(authResult.uid);

    // Proxy to worker service with mission filtering data
    const workerResponse = await fetch(`${WORKER_URL}/collect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        uid: authResult.uid,
        missionFilter: {
          activeMissions
        }
      }),
    });

    const workerData = await workerResponse.json();

    if (!workerResponse.ok) {
      throw new Error(workerData.error || 'Worker service error');
    }

    await createNotification(authResult.uid, {
      type: NotificationType.COLLECTION_FINISHED,
      title: "Job Collection Complete",
      message: `Added ${workerData.added} new jobs from ${workerData.collectors} collectors.`,
      link: "/jobs",
    });

    return NextResponse.json(workerData);
  } catch (error) {
    if (authResult) {
      await createNotification(authResult.uid, {
        type: NotificationType.ERROR,
        title: "Collection Failed",
        message: error instanceof Error ? error.message : "Job collection failed.",
      }).catch(() => undefined);
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Job collection failed.",
      },
      { status: 500 },
    );
  }
}
