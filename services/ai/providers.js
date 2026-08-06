"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDefaultProvider = getDefaultProvider;
exports.getEffectiveProvider = getEffectiveProvider;
exports.getSelectedProvider = getSelectedProvider;
exports.getProviderApiKey = getProviderApiKey;
exports.makeChatGPTRequest = makeChatGPTRequest;
exports.makeGeminiRequest = makeGeminiRequest;
exports.makeDeepSeekRequest = makeDeepSeekRequest;
const api_keys_1 = require("@/services/api-keys/api-keys");
const settings_1 = require("@/services/settings/settings");
/**
 * Gets the default provider based on available environment variable keys
 * This provides automatic fallback when user hasn't configured a provider
 */
function getDefaultProvider() {
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
async function getEffectiveProvider(uid) {
    const settings = await (0, settings_1.getSettings)(uid);
    const userProvider = settings.aiProvider;
    // If user has configured a provider (not "none"), use it
    if (userProvider && userProvider !== "none") {
        return userProvider;
    }
    // Otherwise, fall back to default provider based on environment variables
    return getDefaultProvider();
}
async function getSelectedProvider(uid) {
    return getEffectiveProvider(uid);
}
async function getProviderApiKey(uid, provider) {
    const effectiveProvider = provider || await getEffectiveProvider(uid);
    if (effectiveProvider === "none") {
        return undefined;
    }
    // First try user's API key for this provider
    const userApiKey = await (0, api_keys_1.getApiKey)(uid, effectiveProvider);
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
async function makeChatGPTRequest(uid, messages) {
    var _a, _b;
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
    return ((_b = (_a = data.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || "";
}
async function makeGeminiRequest(uid, prompt) {
    var _a, _b, _c;
    const apiKey = await getProviderApiKey(uid, "gemini");
    if (!apiKey) {
        throw new Error("Gemini API key not found.");
    }
    // Use gemini-3.6-flash for structured JSON extraction (current stable Flash model)
    // Temperature set to 0.0 for deterministic JSON output
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`, {
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
                temperature: 0.0,
            },
        }),
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.statusText} - ${errorText}`);
    }
    const data = await response.json();
    return ((_c = (_b = (_a = data.candidates[0]) === null || _a === void 0 ? void 0 : _a.content) === null || _b === void 0 ? void 0 : _b.parts[0]) === null || _c === void 0 ? void 0 : _c.text) || "";
}
async function makeDeepSeekRequest(uid, messages) {
    var _a, _b;
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
    return ((_b = (_a = data.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || "";
}
