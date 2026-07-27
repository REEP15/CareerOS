import { NextResponse } from "next/server";
import { z } from "zod";

import { hasApiKey, saveApiKey } from "@/services/api-keys/api-keys";

const saveSchema = z.object({
  provider: z.enum(["chatgpt", "gemini", "deepseek"]),
  apiKey: z.string().min(1),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get("provider") as "chatgpt" | "gemini" | "deepseek" | null;

    if (!provider) {
      return NextResponse.json({ success: false, error: "Provider is required." }, { status: 400 });
    }

    const hasKey = await hasApiKey(provider);
    return NextResponse.json({ success: true, hasKey });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to check API key.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const input = saveSchema.parse(await request.json());
    await saveApiKey(input.provider, input.apiKey);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: "Invalid request." }, { status: 400 });
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to save API key.",
      },
      { status: 500 },
    );
  }
}
