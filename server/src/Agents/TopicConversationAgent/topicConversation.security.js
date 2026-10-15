/**
 * Topic Conversation Agent - Security & Prompt Injection Defense Layer
 * Enforces data boundaries, sanitizes untrusted input/output, and prevents prompt injection and secret leakage.
 */

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
  /reveal\s+(your\s+)?(system\s+prompt|instructions|developer\s+mode)/i,
  /disregard\s+(the\s+)?(rules|system\s+directive)/i,
  /act\s+as\s+(an\s+unrestricted|a\s+hacker|jailbreak|DAN|root)/i,
  /print\s+(the\s+)?(environment\s+variables|api\s*key|jwt\s*secret)/i,
  /<script[\s\S]*?>[\s\S]*?<\/script>/i,
  /javascript\s*:/i,
  /drop\s+table/i,
];

const SECRET_PATTERNS = [
  /AIza[0-9A-Za-z-_]{35}/, // Google API Key
  /gsk_[0-9A-Za-z]{40,}/,  // Groq API Key
  /eyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+/, // JWT pattern
  /process\.env\.[A-Z0-9_]+/i,
];

/**
 * Detect potential prompt injection in untrusted text
 */
export const detectPromptInjection = (text) => {
  if (!text || typeof text !== "string") return { safe: true };

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      return {
        safe: false,
        flaggedPattern: pattern.toString(),
        reason: "Detected potential prompt injection or unauthorized instruction override.",
      };
    }
  }

  return { safe: true };
};

/**
 * Check if output contains leaked keys or secrets
 */
export const detectSecretLeakage = (text) => {
  if (!text || typeof text !== "string") return { safe: true };

  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(text)) {
      return {
        safe: false,
        reason: "Output contained sensitive configuration or credential patterns.",
      };
    }
  }

  return { safe: true };
};

/**
 * Sanitize text to remove dangerous scripts and HTML tags
 */
export const sanitizeText = (text) => {
  if (!text || typeof text !== "string") return "";
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/javascript\s*:/gi, "")
    .trim();
};

/**
 * Strip HTML tags from topic content to generate clean plain text for LLM context
 */
export const stripHtmlToText = (html) => {
  if (!html || typeof html !== "string") return "";
  return html
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<\/?[^>]+(>|$)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

/**
 * Encapsulate untrusted data into strict XML-style boundary blocks
 */
export const formatDataBoundary = (tag, content) => {
  const safeContent = sanitizeText(content);
  return `<${tag}>\n${safeContent}\n</${tag}>`;
};
