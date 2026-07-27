import { NextResponse } from "next/server";
import { z } from "zod";

import { getSettings, saveSettings } from "@/services/settings/settings";

export async function GET() {
  try {
    const settings = await getSettings();
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
    const input = settingsSchema.parse(await request.json());
    const settings = await saveSettings(input);
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
