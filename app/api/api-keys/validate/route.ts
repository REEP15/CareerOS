import { NextResponse } from "next/server";
import { z } from "zod";

const validateSchema = z.object({
  provider: z.enum(["chatgpt", "gemini", "deepseek"]),
  apiKey: z.string().min(1),
});

async function validateChatGPT(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch("https://api.openai.com/v1/models", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function validateGemini(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
      method: "GET",
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function validateDeepSeek(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch("https://api.deepseek.com/models", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const input = validateSchema.parse(await request.json());
    let isValid = false;

    switch (input.provider) {
      case "chatgpt":
        isValid = await validateChatGPT(input.apiKey);
        break;
      case "gemini":
        isValid = await validateGemini(input.apiKey);
        break;
      case "deepseek":
        isValid = await validateDeepSeek(input.apiKey);
        break;
    }

    if (isValid) {
      return NextResponse.json({ success: true, valid: true });
    }

    return NextResponse.json(
      { success: false, error: "Invalid API key or wrong AI provider selected." },
      { status: 400 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: "Invalid request." }, { status: 400 });
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to validate API key.",
      },
      { status: 500 },
    );
  }
}
