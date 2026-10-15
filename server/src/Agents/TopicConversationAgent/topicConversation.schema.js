/**
 * Topic Conversation Agent - Schema and Input/Output Validation
 * Enforces strict limits, type checking, and schema compliance for conversation payloads.
 */

export const MAX_MESSAGE_LENGTH = 2000;
export const MIN_MESSAGE_LENGTH = 1;
export const MAX_HISTORY_MESSAGES = 10;
export const MAX_FOLLOWUP_SUGGESTIONS = 3;

export const ALLOWED_INTENTS = ["answer", "example", "simplify", "diagram", "clarify"];

/**
 * Validate incoming learner message
 */
export const validateUserMessage = (rawMessage) => {
  if (typeof rawMessage !== "string") {
    return { valid: false, error: "Message must be a string." };
  }

  const trimmed = rawMessage.trim();
  if (trimmed.length < MIN_MESSAGE_LENGTH) {
    return { valid: false, error: "Message cannot be empty." };
  }

  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return {
      valid: false,
      error: `Message exceeds maximum allowed length of ${MAX_MESSAGE_LENGTH} characters.`,
    };
  }

  return { valid: true, sanitizedMessage: trimmed };
};

/**
 * Validate and sanitize structured agent output
 */
export const validateAgentOutput = (rawOutput) => {
  if (!rawOutput || typeof rawOutput !== "object") {
    return {
      valid: false,
      error: "Agent output must be an object.",
      fallback: {
        intent: "answer",
        answer: String(rawOutput || "I could not formulate an answer for this topic."),
        sourceRefs: [],
        suggestedFollowups: [],
        requestDiagram: false,
      },
    };
  }

  const intent = ALLOWED_INTENTS.includes(rawOutput.intent)
    ? rawOutput.intent
    : "answer";

  const answer =
    typeof rawOutput.answer === "string" && rawOutput.answer.trim().length > 0
      ? rawOutput.answer.trim()
      : "I understand your question regarding this topic. Let's explore the key concepts together.";

  const sourceRefs = Array.isArray(rawOutput.sourceRefs)
    ? rawOutput.sourceRefs.filter((s) => typeof s === "string" && s.trim().length > 0).slice(0, 5)
    : [];

  const suggestedFollowups = Array.isArray(rawOutput.suggestedFollowups)
    ? rawOutput.suggestedFollowups
        .filter((q) => typeof q === "string" && q.trim().length > 0)
        .slice(0, MAX_FOLLOWUP_SUGGESTIONS)
    : [];

  const requestDiagram = Boolean(rawOutput.requestDiagram || intent === "diagram");
  const diagramInstruction =
    typeof rawOutput.diagramInstruction === "string"
      ? rawOutput.diagramInstruction.slice(0, 200)
      : "";

  return {
    valid: true,
    structuredOutput: {
      intent,
      answer,
      sourceRefs,
      suggestedFollowups,
      requestDiagram,
      diagramInstruction,
    },
  };
};

/**
 * Validate suggested questions list
 */
export const validateSuggestedQuestions = (questions) => {
  if (!Array.isArray(questions)) return [];
  return questions
    .filter((q) => typeof q === "string" && q.trim().length > 5 && q.trim().length < 150)
    .map((q) => q.trim())
    .slice(0, 4);
};
