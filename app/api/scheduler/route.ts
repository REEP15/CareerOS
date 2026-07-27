import { NextResponse } from "next/server";
import { z } from "zod";

import { verifyAuthToken } from "@/lib/firebase";
import { runCollectors, runMatcher, refreshDashboard } from "@/services/scheduler/scheduler";

const actionSchema = z.enum(["collect", "match", "dashboard", "all"]);

export async function POST(request: Request) {
  try {
    const authResult = await verifyAuthToken(request);

    if (!authResult) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = z.object({ action: actionSchema.optional() }).parse(await request.json().catch(() => ({})));
    const action = body.action ?? "all";

    if (action === "collect") {
      const result = await runCollectors(authResult.uid);
      return NextResponse.json({ success: true, result });
    }

    if (action === "match") {
      const result = await runMatcher(authResult.uid);
      return NextResponse.json({ success: true, result });
    }

    if (action === "dashboard") {
      const result = await refreshDashboard(authResult.uid);
      return NextResponse.json({ success: true, result });
    }

    const [collectors, matcher, dashboard] = await Promise.all([
      runCollectors(authResult.uid),
      runMatcher(authResult.uid),
      refreshDashboard(authResult.uid),
    ]);

    return NextResponse.json({
      success: true,
      result: { collectors, matcher, dashboard },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Scheduler action failed.",
      },
      { status: 500 },
    );
  }
}
