import { NextResponse } from "next/server";
import { z } from "zod";

import { verifyAuthToken } from "@/lib/firebase";
import { getSettings, saveSettings } from "@/services/settings/settings";

export async function GET(request: Request) {
  try {
    const authResult = await verifyAuthToken(request);

    if (!authResult) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const settings = await getSettings(authResult.uid);
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to load settings.",
      },
      { status: 500 },
    );
  }
}

const settingsSchema = z.object({
  aiProvider: z.enum(["chatgpt", "gemini", "deepseek", "none"]).optional(),
  playwrightHeadless: z.boolean().optional(),
  playwrightTimeoutMs: z.number().min(5000).max(300000).optional(),
  preferredLocations: z.array(z.string()).optional(),
  preferredSalaryMinimum: z.number().min(0).optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
});

export async function PUT(request: Request) {
  try {
    const authResult = await verifyAuthToken(request);

    if (!authResult) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const input = settingsSchema.parse(await request.json());
    const settings = await saveSettings(authResult.uid, input);
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: "Invalid settings." }, { status: 400 });
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to save settings.",
      },
      { status: 500 },
    );
  }
}
