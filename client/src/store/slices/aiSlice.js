import { createSlice } from "@reduxjs/toolkit";

const getInitialProvider = () => {
  try {
    const saved = localStorage.getItem("ai_default_provider");
    if (saved && (saved === "gemini" || saved === "groq")) {
      return saved;
    }
  } catch (e) {
    console.error("Failed to read ai_default_provider from localStorage", e);
  }
  return "gemini";
};

const getInitialGeminiModel = () => {
  try {
    const saved = localStorage.getItem("ai_gemini_model");
    if (saved) return saved;
  } catch (e) {
    console.error("Failed to read ai_gemini_model from localStorage", e);
  }
  return "gemini-3.5-flash-lite";
};

const getInitialGroqModel = () => {
  try {
    const saved = localStorage.getItem("ai_groq_model");
    if (saved) return saved;
  } catch (e) {
    console.error("Failed to read ai_groq_model from localStorage", e);
  }
  return "llama-3.3-70b-versatile";
};

const initialProvider = getInitialProvider();
const initialGeminiModel = getInitialGeminiModel();
const initialGroqModel = getInitialGroqModel();
const initialModel =
  initialProvider === "gemini" ? initialGeminiModel : initialGroqModel;

const initialState = {
  defaultProvider: initialProvider,
  defaultModel: initialModel,
  geminiModel: initialGeminiModel,
  groqModel: initialGroqModel,
};

const aiSlice = createSlice({
  name: "ai",
  initialState,
  reducers: {
    setDefaultProvider: (state, action) => {
      const provider = action.payload === "groq" ? "groq" : "gemini";
      state.defaultProvider = provider;
      state.defaultModel =
        provider === "gemini" ? state.geminiModel : state.groqModel;
      try {
        localStorage.setItem("ai_default_provider", state.defaultProvider);
        localStorage.setItem("ai_default_model", state.defaultModel);
      } catch (e) {
        console.error("Failed to save defaultProvider to localStorage", e);
      }
    },

    setDefaultModel: (state, action) => {
      const model = action.payload;
      state.defaultModel = model;
      if (state.defaultProvider === "gemini") {
        state.geminiModel = model;
        try {
          localStorage.setItem("ai_gemini_model", model);
        } catch (e) {}
      } else {
        state.groqModel = model;
        try {
          localStorage.setItem("ai_groq_model", model);
        } catch (e) {}
      }
      try {
        localStorage.setItem("ai_default_model", model);
      } catch (e) {}
    },

    setProviderModel: (state, action) => {
      const { provider, model } = action.payload;
      if (provider === "gemini") {
        state.geminiModel = model;
        try {
          localStorage.setItem("ai_gemini_model", model);
        } catch (e) {}
      } else if (provider === "groq") {
        state.groqModel = model;
        try {
          localStorage.setItem("ai_groq_model", model);
        } catch (e) {}
      }

      // If updating the active default provider, also update defaultModel
      if (state.defaultProvider === provider) {
        state.defaultModel = model;
        try {
          localStorage.setItem("ai_default_model", model);
        } catch (e) {}
      }
    },

    setAiConfig: (state, action) => {
      const { provider, model } = action.payload;
      if (provider) {
        state.defaultProvider = provider;
        try {
          localStorage.setItem("ai_default_provider", provider);
        } catch (e) {}
      }
      if (model) {
        state.defaultModel = model;
        if (state.defaultProvider === "gemini") {
          state.geminiModel = model;
          try {
            localStorage.setItem("ai_gemini_model", model);
          } catch (e) {}
        } else {
          state.groqModel = model;
          try {
            localStorage.setItem("ai_groq_model", model);
          } catch (e) {}
        }
        try {
          localStorage.setItem("ai_default_model", model);
        } catch (e) {}
      }
    },
  },
});

export const {
  setDefaultProvider,
  setDefaultModel,
  setProviderModel,
  setAiConfig,
} = aiSlice.actions;

export default aiSlice.reducer;
