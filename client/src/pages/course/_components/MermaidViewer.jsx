import { useEffect, useRef, useState } from "react";

// Singleton dynamic loader for Mermaid
let mermaidModulePromise = null;
const loadMermaid = async () => {
  if (window.mermaid) return window.mermaid;
  if (!mermaidModulePromise) {
    mermaidModulePromise = import("https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs")
      .then((m) => {
        const instance = m.default || m;
        instance.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "dark",
          fontFamily: "'Inter', sans-serif",
          themeVariables: {
            darkMode: true,
            background: "transparent",
            mainBkg: "#1e1b4b",
            nodeBorder: "#818cf8",
            primaryColor: "#7c3aed",
            primaryTextColor: "#f5f3ff",
            lineColor: "#a78bfa",
          },
        });
        window.mermaid = instance;
        return instance;
      })
      .catch((err) => {
        console.error("Failed to load Mermaid from CDN:", err);
        throw err;
      });
  }
  return mermaidModulePromise;
};

const MermaidViewer = ({
  mermaidCode,
  title = "Topic Diagram",
  description = "",
  diagramType = "flowchart",
}) => {
  const containerRef = useRef(null);
  const [svgContent, setSvgContent] = useState("");
  const [renderError, setRenderError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showCode, setShowCode] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    const renderDiagram = async () => {
      if (!mermaidCode || !mermaidCode.trim()) {
        setSvgContent("");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setRenderError(null);

      try {
        const mermaid = await loadMermaid();
        if (isCancelled) return;

        // Unique ID for SVG generation
        const renderId = `mermaid_${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(renderId, mermaidCode);

        if (!isCancelled) {
          setSvgContent(svg);
          setIsLoading(false);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error("Mermaid render error:", err);
          setRenderError(err.message || "Failed to render visual diagram");
          setIsLoading(false);
        }
      }
    };

    renderDiagram();

    return () => {
      isCancelled = true;
    };
  }, [mermaidCode]);

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.2, 2.5));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.2, 0.6));
  const handleResetZoom = () => setZoomLevel(1);

  return (
    <div
      style={{
        borderRadius: "14px",
        background: "rgba(15, 23, 42, 0.65)",
        border: "1px solid rgba(124, 58, 237, 0.25)",
        overflow: "hidden",
        boxShadow: "0 8px 30px rgba(0, 0, 0, 0.35)",
        marginTop: "14px",
        marginBottom: "14px",
        transition: "all 0.3s ease",
      }}
    >
      {/* Top Header Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          background: "rgba(124, 58, 237, 0.12)",
          borderBottom: "1px solid rgba(124, 58, 237, 0.2)",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "14px" }}>📐</span>
          <span style={{ color: "white", fontSize: "13px", fontWeight: "700" }}>
            {title}
          </span>
          <span
            style={{
              fontSize: "10px",
              padding: "2px 8px",
              borderRadius: "12px",
              background: "rgba(167, 139, 250, 0.15)",
              color: "#c4b5fd",
              border: "1px solid rgba(167, 139, 250, 0.3)",
              fontWeight: "600",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            {diagramType}
          </span>
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button
            type="button"
            onClick={handleZoomOut}
            title="Zoom Out"
            style={{
              padding: "4px 8px",
              borderRadius: "6px",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "#d1d5db",
              fontSize: "11px",
              cursor: "pointer",
            }}
          >
            −
          </button>
          <button
            type="button"
            onClick={handleResetZoom}
            title="Reset Zoom"
            style={{
              padding: "4px 8px",
              borderRadius: "6px",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "#9ca3af",
              fontSize: "11px",
              cursor: "pointer",
            }}
          >
            {Math.round(zoomLevel * 100)}%
          </button>
          <button
            type="button"
            onClick={handleZoomIn}
            title="Zoom In"
            style={{
              padding: "4px 8px",
              borderRadius: "6px",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "#d1d5db",
              fontSize: "11px",
              cursor: "pointer",
            }}
          >
            +
          </button>
          <button
            type="button"
            onClick={() => setShowCode(!showCode)}
            title="Toggle DSL Source"
            style={{
              padding: "4px 8px",
              borderRadius: "6px",
              background: showCode ? "rgba(124, 58, 237, 0.3)" : "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: showCode ? "#c4b5fd" : "#9ca3af",
              fontSize: "11px",
              cursor: "pointer",
            }}
          >
            {showCode ? "Hide Source" : "Source"}
          </button>
          <button
            type="button"
            onClick={() => setIsFullscreen(true)}
            title="Fullscreen Modal"
            style={{
              padding: "4px 8px",
              borderRadius: "6px",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "#d1d5db",
              fontSize: "11px",
              cursor: "pointer",
            }}
          >
            ⛶
          </button>
        </div>
      </div>

      {/* Description note if available */}
      {description && (
        <div
          style={{
            padding: "8px 16px",
            background: "rgba(0, 0, 0, 0.2)",
            borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
            color: "#9ca3af",
            fontSize: "12px",
            lineHeight: "1.4",
          }}
        >
          {description}
        </div>
      )}

      {/* Source Code View */}
      {showCode && (
        <div
          style={{
            padding: "12px 16px",
            background: "rgba(0, 0, 0, 0.5)",
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
            fontFamily: "monospace",
            fontSize: "11px",
            color: "#a78bfa",
            whiteSpace: "pre-wrap",
            maxHeight: "180px",
            overflowY: "auto",
          }}
        >
          {mermaidCode}
        </div>
      )}

      {/* Diagram Canvas Body */}
      <div
        style={{
          padding: "24px 16px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "180px",
          position: "relative",
          overflowX: "auto",
        }}
      >
        {isLoading && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                border: "3px solid rgba(124, 58, 237, 0.2)",
                borderTopColor: "#a78bfa",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />
            <span style={{ color: "#9ca3af", fontSize: "12px" }}>Rendering visual diagram...</span>
          </div>
        )}

        {renderError && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: "8px",
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.25)",
              color: "#f87171",
              fontSize: "12px",
              textAlign: "center",
            }}
          >
            Failed to render diagram: {renderError}
          </div>
        )}

        {!isLoading && !renderError && svgContent && (
          <div
            ref={containerRef}
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: "center center",
              transition: "transform 0.15s ease",
              width: "100%",
              display: "flex",
              justifyContent: "center",
            }}
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        )}
      </div>

      {/* Fullscreen Lightbox Modal */}
      {isFullscreen && (
        <div
          onClick={() => setIsFullscreen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.85)",
            backdropFilter: "blur(6px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "92vw",
              maxHeight: "90vh",
              width: "1000px",
              background: "#0f172a",
              border: "1px solid rgba(124, 58, 237, 0.4)",
              borderRadius: "16px",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 20px",
                borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                background: "rgba(124, 58, 237, 0.15)",
              }}
            >
              <h3 style={{ color: "white", fontSize: "16px", fontWeight: "700", margin: 0 }}>
                {title}
              </h3>
              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#9ca3af",
                  fontSize: "20px",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>
            <div
              style={{
                flex: 1,
                padding: "32px",
                overflow: "auto",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MermaidViewer;
