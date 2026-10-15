import React, { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import {
  getTopicConversationApi,
  sendTopicMessageApi,
  refreshSuggestedQuestionsApi,
  clearTopicConversationApi,
} from "../../../lib/api";

const PROVIDERS = {
  gemini: {
    label: "Google Gemini",
    models: [
      { id: "gemini-3.5-flash-lite", name: "Gemini 3.5 Flash Lite (Fastest)" },
      { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" },
      { id: "gemini-3.5-flash", name: "Gemini 3.5 Flash" },
    ],
  },
  groq: {
    label: "Groq Cloud",
    models: [
      { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B (High Reasoning)" },
      { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B (Instant)" },
      { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B (Long Context)" },
    ],
  },
};

const TopicConversationPanel = ({
  courseId,
  chapterIndex,
  topicIndex,
  topicTitle,
  isOpen = false,
  onToggle,
  onOpenDiagram,
}) => {
  const reduxProvider = useSelector((state) => state.aiModel?.provider) || "gemini";
  const reduxModel = useSelector((state) => state.aiModel?.model) || "gemini-3.5-flash-lite";

  const [provider, setProvider] = useState(reduxProvider);
  const [model, setModel] = useState(reduxModel);
  const [messages, setMessages] = useState([]);
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshingSuggestions, setIsRefreshingSuggestions] = useState(false);
  const [error, setError] = useState(null);
  const [sessionCount, setSessionCount] = useState(1);
  const [requestDiagramNext, setRequestDiagramNext] = useState(false);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    setProvider(reduxProvider);
    setModel(reduxModel);
  }, [reduxProvider, reduxModel]);

  // Load conversation on mount or when opened
  useEffect(() => {
    let isMounted = true;
    const fetchConversation = async () => {
      if (!courseId || chapterIndex === undefined || topicIndex === undefined) return;
      try {
        const res = await getTopicConversationApi(courseId, chapterIndex, topicIndex, {
          provider,
          model,
        });
        if (isMounted && res.data?.data) {
          setMessages(res.data.data.messages || []);
          setSuggestedQuestions(res.data.data.suggestedQuestions || []);
          setSessionCount(res.data.data.sessionCount || 1);
        }
      } catch (err) {
        if (isMounted) {
          console.warn("Could not load conversation history:", err.message);
        }
      }
    };

    fetchConversation();
    return () => {
      isMounted = false;
    };
  }, [courseId, chapterIndex, topicIndex]);

  // Scroll to bottom of message thread
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isLoading]);

  const handleSendMessage = async (textToSend, isDiagram = false) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    setError(null);
    setInputText("");
    setIsLoading(true);

    const tempUserMsg = {
      messageId: "temp-user-" + Date.now(),
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
      metadata: { diagramRequested: isDiagram || requestDiagramNext },
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setRequestDiagramNext(false);

    try {
      const res = await sendTopicMessageApi(courseId, chapterIndex, topicIndex, {
        message: text,
        requestDiagram: isDiagram || requestDiagramNext,
        provider,
        model,
      });

      if (res.data?.success && res.data?.data?.assistantMessage) {
        const assistantMsg = res.data.data.assistantMessage;
        setMessages((prev) => [
          ...prev.filter((m) => m.messageId !== tempUserMsg.messageId),
          res.data.data.userMessage || tempUserMsg,
          assistantMsg,
        ]);

        if (res.data.data.suggestedFollowups?.length > 0) {
          setSuggestedQuestions(res.data.data.suggestedFollowups);
        }
      }
    } catch (err) {
      console.error("sendTopicMessage error:", err);
      setError(
        err.response?.data?.message ||
          "Could not send message. Please check your connection or API key."
      );
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.messageId !== tempUserMsg.messageId));
      setInputText(text); // restore user's unsent text
    } finally {
      setIsLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleRefreshSuggestions = async () => {
    setIsRefreshingSuggestions(true);
    try {
      const res = await refreshSuggestedQuestionsApi(courseId, chapterIndex, topicIndex, {
        provider,
        model,
      });
      if (res.data?.data?.suggestedQuestions) {
        setSuggestedQuestions(res.data.data.suggestedQuestions);
      }
    } catch (err) {
      console.warn("Could not refresh suggestions:", err.message);
    } finally {
      setIsRefreshingSuggestions(false);
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm("Clear all discussion messages for this topic?")) return;
    try {
      await clearTopicConversationApi(courseId, chapterIndex, topicIndex);
      setMessages([]);
      setError(null);
    } catch (err) {
      setError("Failed to clear discussion.");
    }
  };

  return (
    <div
      style={{
        marginTop: "20px",
        borderRadius: "14px",
        background: "linear-gradient(180deg, rgba(17, 24, 39, 0.7) 0%, rgba(10, 15, 30, 0.85) 100%)",
        border: "1px solid rgba(124, 58, 237, 0.25)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.35)",
        backdropFilter: "blur(12px)",
        overflow: "hidden",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 18px",
          background: "rgba(124, 58, 237, 0.08)",
          borderBottom: isOpen ? "1px solid rgba(124, 58, 237, 0.15)" : "none",
          cursor: "pointer",
          userSelect: "none",
        }}
        onClick={onToggle}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              boxShadow: "0 2px 8px rgba(124, 58, 237, 0.4)",
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontWeight: 600, fontSize: "14px", color: "#f1f5f9" }}>
                Topic Tutor & Doubt Resolution
              </span>
              <span
                style={{
                  fontSize: "11px",
                  padding: "2px 7px",
                  borderRadius: "10px",
                  background: "rgba(124, 58, 237, 0.2)",
                  color: "#c4b5fd",
                  border: "1px solid rgba(124, 58, 237, 0.3)",
                }}
              >
                {messages.length} {messages.length === 1 ? "turn" : "turns"}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: "12px", color: "#94a3b8" }}>
              Ask questions, explore edge cases, or reason about {topicTitle || "this topic"}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }} onClick={(e) => e.stopPropagation()}>
          {/* Clear history button */}
          {messages.length > 0 && (
            <button
              onClick={handleClearHistory}
              title="Clear discussion"
              style={{
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.25)",
                color: "#f87171",
                padding: "5px 10px",
                borderRadius: "6px",
                fontSize: "11px",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              Clear
            </button>
          )}

          {/* Expand/Collapse Toggle */}
          <button
            onClick={onToggle}
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "#cbd5e1",
              padding: "5px 10px",
              borderRadius: "6px",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              cursor: "pointer",
            }}
          >
            {isOpen ? "Hide Discussion" : "Discuss this Topic"}
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              style={{
                transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s",
              }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main Discussion Body */}
      {isOpen && (
        <div style={{ padding: "16px 18px" }}>
          {/* Controls bar: model selection */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "14px",
              paddingBottom: "10px",
              borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
              fontSize: "12px",
              color: "#94a3b8",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <span>AI Engine:</span>
              <select
                value={provider}
                onChange={(e) => {
                  setProvider(e.target.value);
                  setModel(PROVIDERS[e.target.value].models[0].id);
                }}
                style={{
                  background: "#1e1b4b",
                  color: "#e2e8f0",
                  border: "1px solid rgba(124, 58, 237, 0.3)",
                  borderRadius: "6px",
                  padding: "4px 8px",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                <option value="gemini">Google Gemini</option>
                <option value="groq">Groq Cloud</option>
              </select>

              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                style={{
                  background: "#1e1b4b",
                  color: "#e2e8f0",
                  border: "1px solid rgba(124, 58, 237, 0.3)",
                  borderRadius: "6px",
                  padding: "4px 8px",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                {PROVIDERS[provider].models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <span style={{ fontSize: "11px", color: "#64748b" }}>
              Grounding: Topic Context + RAG Vector Evidence
            </span>
          </div>

          {/* Starter Questions (Pills) */}
          {suggestedQuestions.length > 0 && (
            <div style={{ marginBottom: "16px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                }}
              >
                <span style={{ fontSize: "11px", color: "#a78bfa", fontWeight: 500 }}>
                  Suggested Doubts & Inquiries:
                </span>
                <button
                  onClick={handleRefreshSuggestions}
                  disabled={isRefreshingSuggestions}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#94a3b8",
                    fontSize: "11px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    style={{ animation: isRefreshingSuggestions ? "spin 1s linear infinite" : "none" }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {isRefreshingSuggestions ? "Refreshing..." : "New suggestions"}
                </button>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {suggestedQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(q)}
                    disabled={isLoading}
                    style={{
                      background: "rgba(124, 58, 237, 0.08)",
                      border: "1px solid rgba(124, 58, 237, 0.2)",
                      borderRadius: "16px",
                      padding: "5px 11px",
                      color: "#c4b5fd",
                      fontSize: "12px",
                      textAlign: "left",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      maxWidth: "100%",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(124, 58, 237, 0.18)";
                      e.currentTarget.style.borderColor = "rgba(124, 58, 237, 0.4)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(124, 58, 237, 0.08)";
                      e.currentTarget.style.borderColor = "rgba(124, 58, 237, 0.2)";
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message Thread */}
          <div
            style={{
              maxHeight: "420px",
              overflowY: "auto",
              paddingRight: "6px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              marginBottom: "16px",
            }}
          >
            {messages.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "30px 10px",
                  color: "#64748b",
                  fontSize: "13px",
                  background: "rgba(255, 255, 255, 0.02)",
                  borderRadius: "8px",
                  border: "1px dashed rgba(255, 255, 255, 0.08)",
                }}
              >
                No messages yet. Ask any doubt above or choose a suggested question to start!
              </div>
            ) : (
              messages.map((msg, index) => {
                const isUser = msg.role === "user";
                return (
                  <div
                    key={msg.messageId || index}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: isUser ? "flex-end" : "flex-start",
                      gap: "4px",
                    }}
                  >
                    <div
                      style={{
                        maxWidth: "85%",
                        padding: "10px 14px",
                        borderRadius: isUser ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                        background: isUser
                          ? "linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)"
                          : "rgba(30, 41, 59, 0.8)",
                        border: isUser
                          ? "1px solid rgba(139, 92, 246, 0.4)"
                          : "1px solid rgba(255, 255, 255, 0.08)",
                        color: isUser ? "#ffffff" : "#e2e8f0",
                        fontSize: "13.5px",
                        lineHeight: "1.55",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
                      }}
                    >
                      {msg.content}

                      {/* Linked Diagram Banner */}
                      {!isUser && msg.metadata?.diagramRequested && (
                        <div
                          style={{
                            marginTop: "10px",
                            padding: "8px 12px",
                            borderRadius: "8px",
                            background: "rgba(124, 58, 237, 0.15)",
                            border: "1px solid rgba(124, 58, 237, 0.3)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "8px",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2">
                              <polygon points="12 2 2 7 12 12 22 7 12 2" />
                              <polyline points="2 17 12 22 22 17" />
                              <polyline points="2 12 12 17 22 12" />
                            </svg>
                            <span style={{ fontSize: "12px", color: "#e9d5ff", fontWeight: 500 }}>
                              {msg.metadata?.diagramTitle || "Visual Diagram Generated"}
                            </span>
                          </div>
                          {onOpenDiagram && (
                            <button
                              onClick={onOpenDiagram}
                              style={{
                                background: "#7c3aed",
                                border: "none",
                                borderRadius: "4px",
                                color: "#fff",
                                fontSize: "11px",
                                padding: "4px 8px",
                                cursor: "pointer",
                                fontWeight: 500,
                              }}
                            >
                              View Diagram
                            </button>
                          )}
                        </div>
                      )}

                      {/* Source Citation Badges */}
                      {!isUser && msg.metadata?.sourceRefs?.length > 0 && (
                        <div
                          style={{
                            marginTop: "8px",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            flexWrap: "wrap",
                          }}
                        >
                          <span style={{ fontSize: "10.5px", color: "#94a3b8" }}>Sources:</span>
                          {msg.metadata.sourceRefs.map((src, sIdx) => (
                            <span
                              key={sIdx}
                              style={{
                                fontSize: "10.5px",
                                padding: "1px 6px",
                                borderRadius: "4px",
                                background: "rgba(59, 130, 246, 0.15)",
                                border: "1px solid rgba(59, 130, 246, 0.25)",
                                color: "#93c5fd",
                              }}
                            >
                              {src}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Timestamp & Grounding Badge */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        fontSize: "10.5px",
                        color: "#64748b",
                        padding: "0 4px",
                      }}
                    >
                      <span>
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {!isUser && msg.metadata?.evaluationStatus === "passed" && (
                        <span style={{ color: "#34d399", display: "flex", alignItems: "center", gap: "3px" }}>
                          ✓ Grounded in Topic
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {/* Loading Indicator */}
            {isLoading && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px" }}>
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#a78bfa",
                    animation: "pulse 1s infinite alternate",
                  }}
                />
                <span style={{ fontSize: "12px", color: "#c4b5fd" }}>
                  Tutor is reasoning with topic evidence...
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Error Message */}
          {error && (
            <div
              style={{
                marginBottom: "10px",
                padding: "8px 12px",
                borderRadius: "8px",
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "#fca5a5",
                fontSize: "12px",
              }}
            >
              {error}
            </div>
          )}

          {/* Input Box & Toolbar */}
          <div
            style={{
              background: "rgba(15, 23, 42, 0.8)",
              borderRadius: "10px",
              border: "1px solid rgba(124, 58, 237, 0.3)",
              padding: "8px 12px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <textarea
              ref={textareaRef}
              rows={2}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask a doubt or discuss ${topicTitle || "this topic"} (Press Enter to send)...`}
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#f1f5f9",
                fontSize: "13px",
                resize: "none",
                width: "100%",
                fontFamily: "inherit",
              }}
            />

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              {/* Request Diagram Toggle Button */}
              <button
                type="button"
                onClick={() => setRequestDiagramNext((prev) => !prev)}
                title="When enabled, also generate or update the topic diagram"
                style={{
                  background: requestDiagramNext ? "rgba(124, 58, 237, 0.25)" : "transparent",
                  border: requestDiagramNext
                    ? "1px solid rgba(124, 58, 237, 0.5)"
                    : "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "6px",
                  padding: "4px 8px",
                  color: requestDiagramNext ? "#c4b5fd" : "#94a3b8",
                  fontSize: "11px",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="12 2 2 7 12 12 22 7 12 2" />
                  <polyline points="2 17 12 22 22 17" />
                  <polyline points="2 12 12 17 22 12" />
                </svg>
                {requestDiagramNext ? "Will Generate Diagram" : "+ Include Diagram"}
              </button>

              {/* Send Button */}
              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={isLoading || !inputText.trim()}
                style={{
                  background: inputText.trim() && !isLoading
                    ? "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)"
                    : "rgba(255, 255, 255, 0.05)",
                  border: "none",
                  borderRadius: "6px",
                  padding: "6px 14px",
                  color: inputText.trim() && !isLoading ? "#ffffff" : "#64748b",
                  fontSize: "12px",
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  cursor: inputText.trim() && !isLoading ? "pointer" : "not-allowed",
                  boxShadow: inputText.trim() ? "0 2px 8px rgba(124, 58, 237, 0.3)" : "none",
                }}
              >
                <span>Send</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TopicConversationPanel;
