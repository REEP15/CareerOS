import { NextResponse } from "next/server";
import { z } from "zod";

import { getNotifications, getUnreadCount, markNotificationRead, markAllNotificationsRead } from "@/services/notifications/notifications";

export async function GET() {
  try {
    const [notifications, unreadCount] = await Promise.all([getNotifications(), getUnreadCount()]);
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
    const body = patchSchema.parse(await request.json());

    if (body.markAll) {
      await markAllNotificationsRead();
      return NextResponse.json({ success: true });
    }

    if (body.id) {
      await markNotificationRead(body.id);
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
