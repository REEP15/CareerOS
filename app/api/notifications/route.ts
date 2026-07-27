import { NextResponse } from "next/server";
import { z } from "zod";

import { verifyAuthToken } from "@/lib/firebase";
import { getNotifications, getUnreadCount, markNotificationRead, markAllNotificationsRead } from "@/services/notifications/notifications";

export async function GET(request: Request) {
  try {
    const authResult = await verifyAuthToken(request);

    if (!authResult) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const [notifications, unreadCount] = await Promise.all([getNotifications(authResult.uid), getUnreadCount(authResult.uid)]);
    return NextResponse.json({ success: true, notifications, unreadCount });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to load notifications.",
      },
      { status: 500 },
    );
  }
}

const patchSchema = z.object({
  id: z.string().optional(),
  markAll: z.boolean().optional(),
});

export async function PATCH(request: Request) {
  try {
    const authResult = await verifyAuthToken(request);

    if (!authResult) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = patchSchema.parse(await request.json());

    if (body.markAll) {
      await markAllNotificationsRead(authResult.uid);
      return NextResponse.json({ success: true });
    }

    if (body.id) {
      await markNotificationRead(authResult.uid, body.id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: "Provide id or markAll." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update notification.",
      },
      { status: 500 },
    );
  }
}
