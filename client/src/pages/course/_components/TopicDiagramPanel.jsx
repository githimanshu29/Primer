import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import {
  generateTopicDiagramApi,
  getTopicDiagramApi,
  deleteTopicDiagramApi,
} from "../../../lib/api.js";
import MermaidViewer from "./MermaidViewer.jsx";
import { MODEL_OPTIONS } from "../../../lib/models.js";

const TopicDiagramPanel = ({
  courseId,
  chapterIndex,
  topicIndex,
  topicTitle = "",
  topicContent = "",
}) => {
  const queryClient = useQueryClient();
  const { defaultProvider, geminiModel, groqModel } = useSelector((state) => state.ai);

  const [isOpen, setIsOpen] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(defaultProvider || "gemini");
  const [selectedModel, setSelectedModel] = useState(
    defaultProvider === "groq"
      ? groqModel || MODEL_OPTIONS.groq[0]
      : geminiModel || MODEL_OPTIONS.gemini[0]
  );
  const [userInstruction, setUserInstruction] = useState("");
  const [errorMsg, setErrorMsg] = useState(null);

  const queryKey = ["topicDiagram", courseId, chapterIndex, topicIndex];

  // 1. Fetch saved diagram if exists
  const { data: diagramResponse, isLoading: isFetching } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await getTopicDiagramApi(courseId, chapterIndex, topicIndex);
      return res.data;
    },
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const savedDiagram = diagramResponse?.diagram;

  // 2. Generation Mutation
  const generateMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await generateTopicDiagramApi(
        courseId,
        chapterIndex,
        topicIndex,
        payload
      );
      return res.data;
    },
    onSuccess: (data) => {
      setErrorMsg(null);
      setShowConfig(false);
      setIsOpen(true);
      queryClient.setQueryData(queryKey, { success: true, diagram: data.diagram });
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err) => {
      setErrorMsg(err.response?.data?.message || err.message || "Failed to generate diagram");
    },
  });

  // 3. Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await deleteTopicDiagramApi(courseId, chapterIndex, topicIndex);
      return res.data;
    },
    onSuccess: () => {
      queryClient.setQueryData(queryKey, { success: true, diagram: null });
      queryClient.invalidateQueries({ queryKey });
      setIsOpen(false);
    },
  });

  const handleGenerate = () => {
    setErrorMsg(null);
    generateMutation.mutate({
      provider: selectedProvider,
      model: selectedModel,
      userInstruction: userInstruction.trim() || undefined,
    });
  };

  const handleProviderChange = (prov) => {
    setSelectedProvider(prov);
    setSelectedModel(prov === "groq" ? MODEL_OPTIONS.groq[0] : MODEL_OPTIONS.gemini[0]);
  };

  const isGenerating = generateMutation.isPending;

  return (
    <div style={{ marginTop: "10px", marginBottom: "12px" }}>
      {/* Action Header Button Row */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        {savedDiagram ? (
          <>
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                borderRadius: "8px",
                background: isOpen
                  ? "rgba(124, 58, 237, 0.25)"
                  : "rgba(124, 58, 237, 0.12)",
                border: "1px solid rgba(124, 58, 237, 0.35)",
                color: "#c4b5fd",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              <span>{isOpen ? "👁️ Hide Visual Diagram" : "📐 View Visual Diagram"}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowConfig(!showConfig)}
              title="Regenerate diagram with custom prompt or provider"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "6px 10px",
                borderRadius: "8px",
                background: showConfig ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#9ca3af",
                fontSize: "11px",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              <span>🔄</span>
              <span>Regenerate</span>
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setShowConfig(!showConfig)}
            disabled={isGenerating}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 14px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, rgba(124, 58, 237, 0.22), rgba(59, 130, 246, 0.18))",
              border: "1px solid rgba(124, 58, 237, 0.4)",
              color: "#c4b5fd",
              fontSize: "12px",
              fontWeight: "600",
              cursor: isGenerating ? "not-allowed" : "pointer",
              boxShadow: "0 2px 10px rgba(124, 58, 237, 0.15)",
              transition: "all 0.2s ease",
            }}
          >
            <span>✨</span>
            <span>{isGenerating ? "Synthesizing Diagram..." : "Generate Topic Diagram"}</span>
          </button>
        )}
      </div>

      {/* Generation Config & Options Popover */}
      {showConfig && (
        <div
          style={{
            marginTop: "10px",
            padding: "16px",
            borderRadius: "12px",
            background: "rgba(15, 23, 42, 0.8)",
            border: "1px solid rgba(124, 58, 237, 0.3)",
            maxWidth: "520px",
            boxShadow: "0 10px 25px rgba(0, 0, 0, 0.4)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <span style={{ color: "white", fontSize: "13px", fontWeight: "700" }}>
              Diagram Generator Settings
            </span>
            <button
              type="button"
              onClick={() => setShowConfig(false)}
              style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: "14px" }}
            >
              ✕
            </button>
          </div>

          {/* Provider Selection */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "10px" }}>
            <button
              type="button"
              onClick={() => handleProviderChange("gemini")}
              style={{
                padding: "8px",
                borderRadius: "8px",
                background: selectedProvider === "gemini" ? "rgba(124, 58, 237, 0.3)" : "rgba(255, 255, 255, 0.03)",
                border: selectedProvider === "gemini" ? "1px solid #8b5cf6" : "1px solid rgba(255, 255, 255, 0.08)",
                color: selectedProvider === "gemini" ? "#c4b5fd" : "#9ca3af",
                fontSize: "11px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Google Gemini
            </button>

            <button
              type="button"
              onClick={() => handleProviderChange("groq")}
              style={{
                padding: "8px",
                borderRadius: "8px",
                background: selectedProvider === "groq" ? "rgba(249, 115, 22, 0.25)" : "rgba(255, 255, 255, 0.03)",
                border: selectedProvider === "groq" ? "1px solid #f97316" : "1px solid rgba(255, 255, 255, 0.08)",
                color: selectedProvider === "groq" ? "#fdba74" : "#9ca3af",
                fontSize: "11px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Groq Cloud
            </button>
          </div>

          {/* Model Selector */}
          <div style={{ marginBottom: "10px" }}>
            <label style={{ display: "block", color: "#9ca3af", fontSize: "11px", marginBottom: "4px" }}>
              AI Model:
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: "8px",
                background: "rgba(0, 0, 0, 0.4)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "white",
                fontSize: "12px",
                outline: "none",
              }}
            >
              {MODEL_OPTIONS[selectedProvider]?.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Instruction */}
          <div style={{ marginBottom: "12px" }}>
            <label style={{ display: "block", color: "#9ca3af", fontSize: "11px", marginBottom: "4px" }}>
              Custom Instruction (Optional):
            </label>
            <input
              type="text"
              placeholder="e.g. Focus on database cache invalidation flow"
              value={userInstruction}
              onChange={(e) => setUserInstruction(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: "8px",
                background: "rgba(0, 0, 0, 0.3)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "white",
                fontSize: "12px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Action submit */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
            <button
              type="button"
              onClick={() => setShowConfig(false)}
              style={{
                padding: "7px 12px",
                borderRadius: "8px",
                background: "transparent",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#9ca3af",
                fontSize: "11px",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              style={{
                padding: "7px 16px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
                border: "none",
                color: "white",
                fontSize: "12px",
                fontWeight: "600",
                cursor: isGenerating ? "not-allowed" : "pointer",
                boxShadow: "0 2px 10px rgba(124, 58, 237, 0.3)",
              }}
            >
              {isGenerating ? "Generating..." : "Generate Diagram"}
            </button>
          </div>
        </div>
      )}

      {/* Progress / Loading Banner */}
      {isGenerating && (
        <div
          style={{
            marginTop: "10px",
            padding: "16px 20px",
            borderRadius: "12px",
            background: "linear-gradient(135deg, rgba(124, 58, 237, 0.15), rgba(15, 23, 42, 0.8))",
            border: "1px solid rgba(124, 58, 237, 0.3)",
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <div
            style={{
              width: "24px",
              height: "24px",
              border: "3px solid rgba(124, 58, 237, 0.2)",
              borderTopColor: "#a78bfa",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              flexShrink: 0,
            }}
          />
          <div>
            <p style={{ color: "white", fontSize: "13px", fontWeight: "600", margin: 0 }}>
              Synthesizing Visual Diagram for &quot;{topicTitle}&quot;
            </p>
            <p style={{ color: "#9ca3af", fontSize: "11px", margin: "2px 0 0 0" }}>
              Planning structure with {selectedProvider.toUpperCase()} ({selectedModel}), validating intermediate representation, and compiling Mermaid DSL...
            </p>
          </div>
        </div>
      )}

      {/* Error Message Alert */}
      {errorMsg && (
        <div
          style={{
            marginTop: "10px",
            padding: "10px 14px",
            borderRadius: "10px",
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.25)",
            color: "#f87171",
            fontSize: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>⚠️ {errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: "14px" }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Rendered Diagram Viewer */}
      {savedDiagram && isOpen && (
        <MermaidViewer
          mermaidCode={savedDiagram.mermaidCode}
          title={savedDiagram.title || `${topicTitle} Architecture`}
          description={savedDiagram.description}
          diagramType={savedDiagram.diagramType}
        />
      )}
    </div>
  );
};

export default TopicDiagramPanel;
