/**
 * Topic Conversation Agent - Evaluation Layer
 * Deterministic and semantic checks for answer grounding, source citation validity, and security.
 */

import { detectSecretLeakage } from "./topicConversation.security.js";

/**
 * Tokenize text into normalized significant keywords (stopwords removed)
 */
const extractKeywords = (text) => {
  if (!text || typeof text !== "string") return new Set();
  const stopwords = new Set([
    "this", "that", "these", "those", "what", "which", "where", "when", "with",
    "from", "have", "been", "were", "will", "would", "could", "should", "their",
    "there", "about", "above", "after", "again", "also", "into", "just", "like",
    "more", "most", "other", "some", "such", "than", "then", "them", "thence",
  ]);

  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !stopwords.has(w))
  );
};

/**
 * Evaluate answer quality, grounding, and citation authenticity
 */
export const evaluateTopicAnswer = ({
  answer,
  topicContent,
  retrievedChunks = [],
  claimedSourceRefs = [],
  courseLevel = "Beginner",
}) => {
  const notes = [];
  let deterministicPassed = true;
  let groundingScore = 1.0;

  // 1. Deterministic schema & length check
  if (!answer || typeof answer !== "string" || answer.trim().length === 0) {
    deterministicPassed = false;
    notes.push("Answer is empty or invalid string.");
  }

  // 2. Secret leak check
  const leakCheck = detectSecretLeakage(answer);
  if (!leakCheck.safe) {
    deterministicPassed = false;
    notes.push("Security alert: Answer contained potential secret or key leakage.");
  }

  // 3. Source reference verification
  // Verify that any claimed source reference belongs to actual retrieved chunks
  const validChunkTopics = new Set(
    retrievedChunks.map((c) => (c.topic || "").toLowerCase())
  );
  const invalidRefs = claimedSourceRefs.filter(
    (ref) => !validChunkTopics.has(ref.toLowerCase()) && !ref.toLowerCase().includes("topic")
  );

  if (invalidRefs.length > 0 && retrievedChunks.length > 0) {
    notes.push(`Unverified source references detected: ${invalidRefs.join(", ")}`);
  }

  // 4. Grounding ratio check against topic + retrieved evidence
  const combinedContextText = [
    topicContent,
    ...retrievedChunks.map((c) => c.content || ""),
  ].join(" ");

  const contextKeywords = extractKeywords(combinedContextText);
  const answerKeywords = extractKeywords(answer);

  if (contextKeywords.size > 0 && answerKeywords.size > 0) {
    let overlapCount = 0;
    for (const kw of answerKeywords) {
      if (contextKeywords.has(kw)) {
        overlapCount++;
      }
    }
    groundingScore = parseFloat((overlapCount / answerKeywords.size).toFixed(3));

    // If answer contains very low overlap with topic content (< 10%) on a technical question
    if (groundingScore < 0.10 && answerKeywords.size > 15) {
      notes.push(`Low context grounding score (${groundingScore * 100}%). Answer may be relying primarily on general LLM knowledge.`);
    }
  }

  const passed = deterministicPassed && (groundingScore >= 0.05 || answerKeywords.size <= 15);

  return {
    passed,
    deterministicPassed,
    groundingScore,
    claimedSourceRefs: claimedSourceRefs.filter((r) => !invalidRefs.includes(r)),
    notes: notes.join("; ") || "Answer passed all structural, safety, and grounding evaluations.",
  };
};
