import { NextResponse } from "next/server";
import { z } from "zod";

import { runCollectors, runMatcher, refreshDashboard } from "@/services/scheduler/scheduler";

const actionSchema = z.enum(["collect", "match", "dashboard", "all"]);

export async function POST(request: Request) {
  try {
    const body = z.object({ action: actionSchema.optional() }).parse(await request.json().catch(() => ({})));
    const action = body.action ?? "all";

    if (action === "collect") {
      const result = await runCollectors();
      return NextResponse.json({ success: true, result });
    }

    if (action === "match") {
      const result = await runMatcher();
      return NextResponse.json({ success: true, result });
    }

    if (action === "dashboard") {
      const result = await refreshDashboard();
      return NextResponse.json({ success: true, result });
    }

    const [collectors, matcher, dashboard] = await Promise.all([
      runCollectors(),
      runMatcher(),
      refreshDashboard(),
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
