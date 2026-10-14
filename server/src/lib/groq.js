import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";

const defaultGroq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const defaultGemini = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export const AVAILABLE_MODELS = {
  groq: [
    {
      id: "llama-3.3-70b-versatile",
      name: "Llama 3.3 70B Versatile",
      description: "Top-tier 70B reasoning, recommended for course layouts",
      isDefault: true,
    },
    {
      id: "llama-3.1-8b-instant",
      name: "Llama 3.1 8B Instant",
      description: "Ultra-low latency, blazing fast responses",
    },
    {
      id: "deepseek-r1-distill-llama-70b",
      name: "DeepSeek R1 Distill 70B",
      description: "Deep reasoning & structured output excellence",
    },
    {
      id: "mixtral-8x7b-32768",
      name: "Mixtral 8x7B (32k context)",
      description: "Massive context window for rich course materials",
    },
    {
      id: "gemma2-9b-it",
      name: "Gemma 2 9B IT",
      description: "Google's lightweight open model hosted on Groq",
    },
  ],
  gemini: [
    {
      id: "gemini-3.8-flash",
      name: "Gemini 3.8 Flash",
      description: "State-of-the-art fast reasoning model",
    },
    {
      id: "gemini-3.7-flash",
      name: "Gemini 3.7 Flash",
      description: "High accuracy and multimodal intelligence",
    },
    {
      id: "gemini-3.6-flash",
      name: "Gemini 3.6 Flash",
      description: "Fast, reliable structured generation",
    },
    {
      id: "gemini-3.5-flash",
      name: "Gemini 3.5 Flash",
      description: "Optimized generation speed & low latency",
    },
    {
      id: "gemini-3-flash-preview",
      name: "Gemini 3 Flash Preview",
      description: "Early preview edition of Gemini 3 Flash",
    },
    {
      id: "gemini-2.5-flash",
      name: "Gemini 2.5 Flash",
      description: "Legacy Gemini Flash model",
    },
    {
      id: "gemini-3.5-flash-lite",
      name: "Gemini 3.5 Flash Lite",
      description: "Lightweight and cost-efficient execution (Default)",
      isDefault: true,
    },
    {
      id: "gemini-3.1-flash-lite",
      name: "Gemini 3.1 Flash Lite",
      description: "Ultra-lean high-speed generation",
    },
  ],
};

const extractGeminiText = (result) => {
  if (result?.text) return result.text;
  const parts = result?.candidates?.[0]?.content?.parts || [];
  return parts
    .map((p) => p.text || "")
    .join("")
    .trim();
};

export const generateWithModel = async ({
  prompt,
  provider = "groq",
  model,
  apiKey,
}) => {
  if (provider === "gemini") {
    const activeKey = apiKey || process.env.GEMINI_API_KEY;
    const client = apiKey ? new GoogleGenAI({ apiKey: activeKey }) : defaultGemini;
    const modelToUse = model || "gemini-3.5-flash-lite";

    const resp = await client.models.generateContent({
      model: modelToUse,
      contents: prompt,
    });
    return extractGeminiText(resp) || "";
  }

  const activeKey = apiKey || process.env.GROQ_API_KEY;
  const client = apiKey ? new Groq({ apiKey: activeKey }) : defaultGroq;
  const modelToUse = model || "llama-3.3-70b-versatile";

  const response = await client.chat.completions.create({
    model: modelToUse,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 8192,
  });
  return response.choices[0]?.message?.content || "";
};

export const testApiKeyConnection = async ({ provider, apiKey, model }) => {
  if (!apiKey || !apiKey.trim()) {
    return { success: false, message: "API key cannot be empty" };
  }

  const cleanKey = apiKey.trim();

  try {
    if (provider === "gemini") {
      const client = new GoogleGenAI({ apiKey: cleanKey });
      const modelToUse = model || "gemini-3.5-flash-lite";
      const resp = await client.models.generateContent({
        model: modelToUse,
        contents: "Respond with the word 'OK'",
      });
      const text = extractGeminiText(resp);
      if (text) {
        return {
          success: true,
          message: `Successfully connected to Gemini API (${modelToUse})!`,
        };
      }
      return { success: false, message: "Gemini returned empty response" };
    }

    // Default: Groq
    const client = new Groq({ apiKey: cleanKey });
    const modelToUse = model || "llama-3.1-8b-instant";
    const response = await client.chat.completions.create({
      model: modelToUse,
      messages: [{ role: "user", content: "Respond with OK" }],
      max_tokens: 10,
    });
    if (response?.choices?.[0]?.message?.content) {
      return {
        success: true,
        message: `Successfully connected to Groq API (${modelToUse})!`,
      };
    }
    return { success: false, message: "Groq returned empty response" };
  } catch (err) {
    console.error("testApiKeyConnection error:", err.message);
    return {
      success: false,
      message: err.message || "Failed to validate API key with provider",
    };
  }
};

export default defaultGroq;
