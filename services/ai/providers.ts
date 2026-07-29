import { getApiKey } from "@/services/api-keys/api-keys";
import { getSettings } from "@/services/settings/settings";
import type { AiProviderName } from "@/types/settings";

/**
 * Gets the default provider based on available environment variable keys
 * This provides automatic fallback when user hasn't configured a provider
 */
export function getDefaultProvider(): AiProviderName {
  // Check for environment variable keys in priority order
  if (process.env.GEMINI_API_KEY) {
    return "gemini";
  }
  if (process.env.OPENAI_API_KEY) {
    return "chatgpt";
  }
  if (process.env.DEEPSEEK_API_KEY) {
    return "deepseek";
  }
  return "none";
}

/**
 * Gets the effective provider for AI operations
 * Falls back to default provider if user provider is "none"
 */
export async function getEffectiveProvider(uid: string): Promise<AiProviderName> {
  const settings = await getSettings(uid);
  const userProvider = settings.aiProvider;
  
  // Debug logging
  console.log("Provider selection debug:");
  console.log(`  userProvider: ${userProvider}`);
  console.log(`  hasGeminiKey: ${!!process.env.GEMINI_API_KEY}`);
  console.log(`  hasOpenAIKey: ${!!process.env.OPENAI_API_KEY}`);
  console.log(`  hasDeepSeekKey: ${!!process.env.DEEPSEEK_API_KEY}`);
  
  // If user has configured a provider (not "none"), use it
  if (userProvider && userProvider !== "none") {
    console.log(`  selectedProvider: ${userProvider} (user-configured)`);
    return userProvider;
  }
  
  // Otherwise, fall back to default provider based on environment variables
  const defaultProvider = getDefaultProvider();
  console.log(`  selectedProvider: ${defaultProvider} (default from env)`);
  return defaultProvider;
}

export async function getSelectedProvider(uid: string): Promise<AiProviderName> {
  return getEffectiveProvider(uid);
}

export async function getProviderApiKey(uid: string, provider?: AiProviderName): Promise<string | undefined> {
  const effectiveProvider = provider || await getEffectiveProvider(uid);
  
  if (effectiveProvider === "none") {
    return undefined;
  }
  
  // First try user's API key for this provider
  const userApiKey = await getApiKey(uid, effectiveProvider);
  if (userApiKey) {
    return userApiKey;
  }
  
  // Fall back to environment variable for default provider
  if (effectiveProvider === "gemini" && process.env.GEMINI_API_KEY) {
    return process.env.GEMINI_API_KEY;
  }
  if (effectiveProvider === "chatgpt" && process.env.OPENAI_API_KEY) {
    return process.env.OPENAI_API_KEY;
  }
  if (effectiveProvider === "deepseek" && process.env.DEEPSEEK_API_KEY) {
    return process.env.DEEPSEEK_API_KEY;
  }
  
  return undefined;
}

export async function makeChatGPTRequest(uid: string, messages: Array<{ role: string; content: string }>): Promise<string> {
  const apiKey = await getProviderApiKey(uid, "chatgpt");
  if (!apiKey) {
    throw new Error("ChatGPT API key not found.");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`ChatGPT API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || "";
}

export async function makeGeminiRequest(uid: string, prompt: string): Promise<string> {
  const apiKey = await getProviderApiKey(uid, "gemini");
  if (!apiKey) {
    throw new Error("Gemini API key not found.");
  }

  // Use gemini-2.5-flash for free tier compatibility (updated from gemini-1.5-pro)
  // gemini-2.5-flash is stable, has 1M token context, and is well-supported on free tier
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.7,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.candidates[0]?.content?.parts[0]?.text || "";
}

export async function makeDeepSeekRequest(uid: string, messages: Array<{ role: string; content: string }>): Promise<string> {
  const apiKey = await getProviderApiKey(uid, "deepseek");
  if (!apiKey) {
    throw new Error("DeepSeek API key not found.");
  }

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepSeek API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || "";
}
