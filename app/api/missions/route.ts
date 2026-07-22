import { NextResponse } from "next/server";
import { z } from "zod";

import {
  createMission,
  deleteMission,
  duplicateMission,
  getMission,
  getMissions,
  setMissionActive,
  updateMission,
} from "@/services/missions/missions";

const missionInputSchema = z.object({
  name: z.string().min(1),
  keywords: z.array(z.string()),
  excludedKeywords: z.array(z.string()),
  locations: z.array(z.string()),
  remote: z.boolean(),
  minimumSalary: z.number().optional(),
  minimumMatch: z.number().min(0).max(100),
  sources: z.array(z.string()),
  active: z.boolean(),
});

export async function GET() {
  try {
    const missions = await getMissions();
    return NextResponse.json({ success: true, missions });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to load missions.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const input = missionInputSchema.parse(await request.json());
    const mission = await createMission(input);
    return NextResponse.json({ success: true, mission });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: "Invalid mission data." }, { status: 400 });
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create mission.",
      },
      { status: 500 },
    );
  }
}

const patchSchema = z.object({
  id: z.string().min(1),
  action: z.enum(["update", "delete", "duplicate", "enable", "disable"]).optional(),
  data: missionInputSchema.partial().optional(),
});

export async function PATCH(request: Request) {
  try {
    const body = patchSchema.parse(await request.json());

    if (body.action === "delete") {
      await deleteMission(body.id);
      return NextResponse.json({ success: true });
    }

    if (body.action === "duplicate") {
      const mission = await duplicateMission(body.id);
      return NextResponse.json({ success: true, mission });
    }

    if (body.action === "enable") {
      const mission = await setMissionActive(body.id, true);
      return NextResponse.json({ success: true, mission });
    }

    if (body.action === "disable") {
      const mission = await setMissionActive(body.id, false);
      return NextResponse.json({ success: true, mission });
    }

    if (body.data) {
      const mission = await updateMission(body.id, body.data);
      return NextResponse.json({ success: true, mission });
    }

    return NextResponse.json({ success: false, error: "Invalid action." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update mission.",
      },
      { status: 500 },
    );
  }
}

export async function GET_BY_ID(id: string) {
  const mission = await getMission(id);
  return mission;
}
