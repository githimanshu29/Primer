export const MODEL_OPTIONS = {
  groq: [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "deepseek-r1-distill-llama-70b",
    "mixtral-8x7b-32768",
    "gemma2-9b-it",
  ],
  gemini: [
    "gemini-3.8-flash",
    "gemini-3.7-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3-flash-preview",
    "gemini-2.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
  ],
};

export const GROQ_MODELS_META = [
  { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B Versatile", badge: "Recommended" },
  { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B Instant", badge: "Fastest" },
  { id: "deepseek-r1-distill-llama-70b", name: "DeepSeek R1 Distill 70B", badge: "Reasoning" },
  { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B (32k)", badge: "Long Context" },
  { id: "gemma2-9b-it", name: "Gemma 2 9B IT", badge: "Google" },
];

export const GEMINI_MODELS_META = [
  { id: "gemini-3.5-flash-lite", name: "gemini-3.5-flash-lite", badge: "Default" },
  { id: "gemini-3.8-flash", name: "gemini-3.8-flash", badge: "Latest Flash" },
  { id: "gemini-3.7-flash", name: "gemini-3.7-flash", badge: "Reasoning" },
  { id: "gemini-3.6-flash", name: "gemini-3.6-flash", badge: "Fast" },
  { id: "gemini-3.5-flash", name: "gemini-3.5-flash", badge: "Balanced" },
  { id: "gemini-3-flash-preview", name: "gemini-3-flash-preview", badge: "Preview" },
  { id: "gemini-3.1-flash-lite", name: "gemini-3.1-flash-lite", badge: "Ultra-Fast" },
  { id: "gemini-2.5-flash", name: "gemini-2.5-flash", badge: "Legacy" },
];
