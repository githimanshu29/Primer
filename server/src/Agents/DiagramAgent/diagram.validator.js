/**
 * Diagram Agent - Mermaid Syntax & Security Validator
 * Validates compiled Mermaid DSL to ensure strict sandbox compliance.
 */

const FORBIDDEN_PATTERNS = [
  /click\s+[a-zA-Z0-9_]+/i,
  /href\s*=/i,
  /javascript:/i,
  /data:text\/html/i,
  /<script/i,
  /<\/script>/i,
  /<iframe/i,
  /onerror\s*=/i,
  /onload\s*=/i,
  /%%\{\s*init\s*:/i, // forbid dynamic directive overriding
];

export const validateMermaidSecurity = (mermaidCode) => {
  const errors = [];

  if (!mermaidCode || typeof mermaidCode !== "string") {
    return { valid: false, errors: ["Mermaid code is empty or not a string"] };
  }

  if (mermaidCode.length > 6000) {
    errors.push("Compiled Mermaid code exceeds maximum length limit of 6000 characters");
  }

  // Check against forbidden security patterns
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(mermaidCode)) {
      errors.push(`Forbidden directive or executable pattern detected: ${pattern}`);
    }
  }

  // Ensure diagram starts with allowed diagram declarations
  const trimmed = mermaidCode.trim();
  const startsWithValidDeclaration =
    trimmed.startsWith("flowchart") ||
    trimmed.startsWith("graph") ||
    trimmed.startsWith("sequenceDiagram");

  if (!startsWithValidDeclaration) {
    errors.push("Mermaid code does not begin with an authorized diagram declaration");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};
