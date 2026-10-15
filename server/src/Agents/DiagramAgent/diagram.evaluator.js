/**
 * Diagram Agent - Multi-Stage Evaluation Layer
 * Evaluates structural correctness, security compliance, and source grounding.
 */

import { validateMermaidSecurity } from "./diagram.validator.js";

const STOP_WORDS = new Set([
  "the", "is", "at", "which", "on", "and", "a", "an", "in", "to", "of", "for", "with",
  "as", "by", "from", "that", "this", "it", "are", "be", "was", "were", "or", "an",
  "into", "data", "how", "what", "when", "where", "user", "step", "process"
]);

// Extract meaningful normalized tokens from text
const extractKeywords = (text = "") => {
  return text
    .toLowerCase()
    .replace(/<[^>]*>/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
};

export const evaluateInputSuitability = (topicName, topicContent = "") => {
  const cleanContent = topicContent.replace(/<[^>]*>/g, "").trim();

  if (!topicName || typeof topicName !== "string" || topicName.trim().length === 0) {
    return {
      suitable: false,
      reason: "Topic title is missing or empty.",
    };
  }

  if (cleanContent.length < 35 && topicName.length < 15) {
    return {
      suitable: false,
      reason: "Topic content is currently too brief to synthesize a meaningful visual diagram.",
    };
  }

  return { suitable: true };
};

export const evaluateDiagram = ({ ir, mermaidCode, canonicalTopicText = "" }) => {
  const notes = [];
  let schemaPassed = true;
  let syntaxPassed = true;
  let groundingPassed = true;

  if (!ir) {
    return {
      passed: false,
      schemaPassed: false,
      syntaxPassed: false,
      groundingPassed: false,
      groundingScore: 0,
      notes: "Missing diagram specification",
    };
  }

  // 1. Mermaid Security & Syntax Check
  const securityCheck = validateMermaidSecurity(mermaidCode);
  if (!securityCheck.valid) {
    syntaxPassed = false;
    notes.push(...securityCheck.errors);
  }

  // 2. Connectivity Check (for flowcharts)
  if (ir.diagramType === "flowchart") {
    const nodes = ir.nodes || [];
    const edges = ir.edges || [];
    const connectedNodes = new Set();

    edges.forEach((e) => {
      connectedNodes.add(e.from);
      connectedNodes.add(e.to);
    });

    const orphanCount = nodes.filter((n) => !connectedNodes.has(n.id)).length;
    if (orphanCount > 0 && nodes.length > 2) {
      notes.push(`Detected ${orphanCount} disconnected node(s) in diagram flow.`);
    }
  }

  // 3. Grounding & Factual Consistency Check
  const topicKeywords = new Set(extractKeywords(canonicalTopicText + " " + (ir.title || "")));
  const allLabels = [];

  if (ir.diagramType === "sequence") {
    (ir.participants || []).forEach((p) => allLabels.push(p.label));
    (ir.messages || []).forEach((m) => allLabels.push(m.label));
  } else {
    (ir.nodes || []).forEach((n) => allLabels.push(n.label));
    (ir.edges || []).forEach((e) => e.label && allLabels.push(e.label));
  }

  let matchedTokens = 0;
  let totalEvaluatedTokens = 0;

  allLabels.forEach((label) => {
    const tokens = extractKeywords(label);
    tokens.forEach((token) => {
      totalEvaluatedTokens++;
      if (topicKeywords.has(token) || topicKeywords.has(token.slice(0, -1))) {
        matchedTokens++;
      }
    });
  });

  // Calculate grounding ratio (if total tokens is small, grant standard grounding)
  let groundingScore = 100;
  if (totalEvaluatedTokens >= 3 && topicKeywords.size >= 5) {
    const ratio = matchedTokens / totalEvaluatedTokens;
    groundingScore = Math.min(100, Math.round(ratio * 120)); // slightly generous calibration
    if (groundingScore < 30) {
      groundingPassed = false;
      notes.push("Low grounding score: diagram concepts diverge significantly from topic content.");
    }
  }

  const passed = schemaPassed && syntaxPassed && groundingPassed;

  return {
    passed,
    schemaPassed,
    syntaxPassed,
    groundingPassed,
    groundingScore,
    notes: notes.join("; ") || "All structural, security, and grounding evaluations passed.",
  };
};
