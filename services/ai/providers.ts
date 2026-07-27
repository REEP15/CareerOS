import { getApiKey } from "@/services/api-keys/api-keys";
import { getSettings } from "@/services/settings/settings";
import type { AiProviderName } from "@/types/settings";

export async function getSelectedProvider(uid: string): Promise<AiProviderName> {
  const settings = await getSettings(uid);
  return settings.aiProvider;
}

export async function getProviderApiKey(uid: string): Promise<string | undefined> {
  const provider = await getSelectedProvider(uid);
  if (provider === "none") {
    return undefined;
  }
  return await getApiKey(uid, provider);
}

export async function makeChatGPTRequest(uid: string, messages: Array<{ role: string; content: string }>): Promise<string> {
  const apiKey = await getApiKey(uid, "chatgpt");
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
  const apiKey = await getApiKey(uid, "gemini");
  if (!apiKey) {
    throw new Error("Gemini API key not found.");
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`, {
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
  const apiKey = await getApiKey(uid, "deepseek");
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
