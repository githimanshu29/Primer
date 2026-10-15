/**
 * Topic Conversation Agent - Service Layer
 * Coordinates authorization, context retrieval (RAG), conversation persistence,
 * tutor planning, diagram integration, and safety evaluation.
 */

import ChatHistory from "../../models/ChatHistory.js";
import { verifyCourseAccess, generateTopicDiagramService } from "../DiagramAgent/diagram.service.js";
import { retrieveRelevantChunks } from "../../lib/langchain/vectorStore.js";
import { validateUserMessage } from "./topicConversation.schema.js";
import {
  detectPromptInjection,
  stripHtmlToText,
  sanitizeText,
} from "./topicConversation.security.js";
import { evaluateTopicAnswer } from "./topicConversation.evaluator.js";
import { planTutorResponse, planSuggestedQuestions } from "./topicConversation.planner.js";
import logger from "../../lib/logger.js";

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes for new session count increment

/**
 * Helper to resolve canonical course, chapter and topic context
 */
export const resolveTopicContext = async (courseId, chapterIndex, topicIndex, user) => {
  const access = await verifyCourseAccess(courseId, user);
  if (!access.authorized) {
    const error = new Error(access.message);
    error.statusCode = access.status;
    throw error;
  }

  const { course } = access;
  const chIdx = parseInt(chapterIndex, 10);
  const tIdx = parseInt(topicIndex, 10);

  const chapterLayout = course.courseJson?.chapters?.[chIdx];
  const chapterName = chapterLayout?.chapterName || `Chapter ${chIdx + 1}`;
  const topicName = chapterLayout?.topics?.[tIdx] || `Topic ${tIdx + 1}`;

  const chapterBuilt = course.courseContent?.[chIdx];
  const topicContentObj = chapterBuilt?.courseData?.content?.[tIdx];
  const topicHtml = topicContentObj?.htmlContent || "";
  const topicCleanText = stripHtmlToText(topicHtml) || topicName;

  return {
    course,
    chIdx,
    tIdx,
    chapterName,
    topicName,
    topicHtml,
    topicCleanText,
    courseLevel: course.level || "Beginner",
  };
};

/**
 * Get or initialize persistent conversation for a topic
 */
export const getTopicConversationService = async ({
  courseId,
  chapterIndex,
  topicIndex,
  user,
  provider = "gemini",
  model = "",
}) => {
  const context = await resolveTopicContext(courseId, chapterIndex, topicIndex, user);
  const { chIdx, tIdx, topicName, topicCleanText, courseLevel } = context;

  let chatHistory = await ChatHistory.findOne({
    courseId,
    chapterIndex: chIdx,
    topicIndex: tIdx,
    userId: user._id,
  });

  const now = new Date();

  if (!chatHistory) {
    // Generate initial starter questions for this topic
    const apiKey = user.apiKeys?.[provider] || "";
    const starterQuestions = await planSuggestedQuestions({
      topicName,
      topicContent: topicCleanText,
      courseLevel,
      provider,
      model,
      apiKey,
    });

    chatHistory = await ChatHistory.create({
      courseId,
      chapterIndex: chIdx,
      topicIndex: tIdx,
      topic: topicName,
      userId: user._id,
      messages: [],
      suggestedQuestions: starterQuestions,
      sessionCount: 1,
      lastActive: now,
    });
  } else {
    // Update session count if previous activity was more than 30 mins ago
    const timeSinceActive = now.getTime() - new Date(chatHistory.lastActive).getTime();
    if (timeSinceActive > SESSION_TIMEOUT_MS) {
      chatHistory.sessionCount += 1;
    }
    chatHistory.lastActive = now;

    // If starter questions were never generated, populate them now
    if (!chatHistory.suggestedQuestions || chatHistory.suggestedQuestions.length === 0) {
      const apiKey = user.apiKeys?.[provider] || "";
      chatHistory.suggestedQuestions = await planSuggestedQuestions({
        topicName,
        topicContent: topicCleanText,
        courseLevel,
        provider,
        model,
        apiKey,
      });
    }

    await chatHistory.save();
  }

  return {
    conversationId: chatHistory._id,
    topic: chatHistory.topic,
    chapterIndex: chIdx,
    topicIndex: tIdx,
    messages: chatHistory.messages,
    suggestedQuestions: chatHistory.suggestedQuestions,
    sessionCount: chatHistory.sessionCount,
    lastActive: chatHistory.lastActive,
    courseLevel,
  };
};

/**
 * Post a user message and receive grounded tutor reasoning / diagram response
 */
export const sendTopicMessageService = async ({
  courseId,
  chapterIndex,
  topicIndex,
  message,
  requestDiagram = false,
  provider = "gemini",
  model = "",
  user,
}) => {
  // 1. Validate user message
  const msgValidation = validateUserMessage(message);
  if (!msgValidation.valid) {
    const error = new Error(msgValidation.error);
    error.statusCode = 400;
    throw error;
  }
  const cleanMessage = msgValidation.sanitizedMessage;

  // 2. Authorize and resolve context
  const context = await resolveTopicContext(courseId, chapterIndex, topicIndex, user);
  const { course, chIdx, tIdx, chapterName, topicName, topicCleanText, courseLevel } = context;

  // 3. Load or create ChatHistory
  let chatHistory = await ChatHistory.findOne({
    courseId,
    chapterIndex: chIdx,
    topicIndex: tIdx,
    userId: user._id,
  });

  const now = new Date();
  if (!chatHistory) {
    chatHistory = await ChatHistory.create({
      courseId,
      chapterIndex: chIdx,
      topicIndex: tIdx,
      topic: topicName,
      userId: user._id,
      messages: [],
      sessionCount: 1,
      lastActive: now,
    });
  } else {
    const timeSinceActive = now.getTime() - new Date(chatHistory.lastActive).getTime();
    if (timeSinceActive > SESSION_TIMEOUT_MS) {
      chatHistory.sessionCount += 1;
    }
    chatHistory.lastActive = now;
  }

  // 4. Prompt injection check
  const injectionCheck = detectPromptInjection(cleanMessage);
  if (!injectionCheck.safe) {
    const userMsg = {
      role: "user",
      content: cleanMessage,
      timestamp: now,
      metadata: { intent: "clarify", evaluationStatus: "flagged" },
    };

    const assistantMsg = {
      role: "assistant",
      content: "I cannot execute commands that attempt to override system rules or access restricted configurations. Please ask a question related to the educational topic.",
      timestamp: new Date(),
      metadata: {
        intent: "clarify",
        sourceRefs: [],
        diagramRequested: false,
        evaluationStatus: "flagged",
        evaluationNotes: injectionCheck.reason,
      },
    };

    chatHistory.messages.push(userMsg, assistantMsg);
    await chatHistory.save();

    return {
      conversationId: chatHistory._id,
      userMessage: userMsg,
      assistantMessage: assistantMsg,
      suggestedFollowups: [],
      evaluation: { passed: false, notes: injectionCheck.reason },
    };
  }

  // 5. Retrieve supplementary vector chunks (RAG) from prior chapters/topics
  let retrievedChunks = [];
  if (chIdx > 0) {
    try {
      retrievedChunks = await retrieveRelevantChunks({
        courseId,
        userId: course.createdBy || user._id,
        query: `${cleanMessage} ${topicName}`,
        currentChapterIndex: chIdx,
        topK: 3,
      });
    } catch (ragErr) {
      logger.warn(`RAG retrieval failed: ${ragErr.message}`);
    }
  }

  // 6. Plan tutor response
  const apiKey = user.apiKeys?.[provider] || "";
  const boundedHistory = chatHistory.messages.slice(-10);

  const plannerResult = await planTutorResponse({
    userMessage: cleanMessage,
    topicName,
    topicContent: topicCleanText,
    chapterName,
    courseName: course.name || "Course",
    courseLevel,
    retrievedChunks,
    conversationHistory: boundedHistory,
    provider,
    model,
    apiKey,
  });

  // 7. Handle explicit diagram request or diagram intent
  let diagramMetadata = {
    diagramRequested: false,
    diagramId: null,
    diagramTitle: "",
  };

  const shouldGenerateDiagram = Boolean(requestDiagram || plannerResult.requestDiagram || plannerResult.intent === "diagram");

  if (shouldGenerateDiagram) {
    try {
      logger.info(`Invoking Diagram Agent for topic: ${topicName} via chat intent`);
      const diagramResult = await generateTopicDiagramService({
        courseId,
        chapterIndex: chIdx,
        topicIndex: tIdx,
        userInstruction: plannerResult.diagramInstruction || cleanMessage,
        provider,
        model,
        user,
      });

      diagramMetadata = {
        diagramRequested: true,
        diagramId: diagramResult.diagramId,
        diagramTitle: diagramResult.title,
      };
    } catch (diagramError) {
      logger.warn(`Diagram generation from chat failed: ${diagramError.message}`);
      diagramMetadata = {
        diagramRequested: true,
        diagramId: null,
        diagramTitle: "Diagram generation could not be completed.",
      };
    }
  }

  // 8. Evaluate answer quality and grounding
  const evaluation = evaluateTopicAnswer({
    answer: plannerResult.answer,
    topicContent: topicCleanText,
    retrievedChunks,
    claimedSourceRefs: plannerResult.sourceRefs,
    courseLevel,
  });

  // 9. Persist messages
  const userMsg = {
    role: "user",
    content: cleanMessage,
    timestamp: now,
    metadata: {
      intent: plannerResult.intent,
      diagramRequested: shouldGenerateDiagram,
    },
  };

  const assistantMsg = {
    role: "assistant",
    content: sanitizeText(plannerResult.answer),
    timestamp: new Date(),
    metadata: {
      intent: plannerResult.intent,
      sourceRefs: evaluation.claimedSourceRefs,
      diagramRequested: diagramMetadata.diagramRequested,
      diagramId: diagramMetadata.diagramId,
      diagramTitle: diagramMetadata.diagramTitle,
      evaluationStatus: evaluation.passed ? "passed" : "flagged",
      evaluationNotes: evaluation.notes,
    },
  };

  chatHistory.messages.push(userMsg, assistantMsg);
  await chatHistory.save();

  return {
    conversationId: chatHistory._id,
    userMessage: userMsg,
    assistantMessage: assistantMsg,
    suggestedFollowups: plannerResult.suggestedFollowups,
    diagram: diagramMetadata,
    evaluation,
  };
};

/**
 * Clear/reset discussion history for a topic
 */
export const clearTopicConversationService = async ({
  courseId,
  chapterIndex,
  topicIndex,
  user,
}) => {
  const context = await resolveTopicContext(courseId, chapterIndex, topicIndex, user);
  const { chIdx, tIdx } = context;

  const result = await ChatHistory.findOneAndUpdate(
    {
      courseId,
      chapterIndex: chIdx,
      topicIndex: tIdx,
      userId: user._id,
    },
    {
      $set: { messages: [], lastActive: new Date() },
    },
    { new: true }
  );

  return {
    success: true,
    message: "Conversation history cleared successfully.",
    conversationId: result?._id,
  };
};

/**
 * Regenerate fresh suggested questions for a topic
 */
export const refreshSuggestedQuestionsService = async ({
  courseId,
  chapterIndex,
  topicIndex,
  user,
  provider = "gemini",
  model = "",
}) => {
  const context = await resolveTopicContext(courseId, chapterIndex, topicIndex, user);
  const { chIdx, tIdx, topicName, topicCleanText, courseLevel } = context;

  const apiKey = user.apiKeys?.[provider] || "";
  const newQuestions = await planSuggestedQuestions({
    topicName,
    topicContent: topicCleanText,
    courseLevel,
    provider,
    model,
    apiKey,
  });

  await ChatHistory.findOneAndUpdate(
    {
      courseId,
      chapterIndex: chIdx,
      topicIndex: tIdx,
      userId: user._id,
    },
    {
      $set: { suggestedQuestions: newQuestions, lastActive: new Date() },
    },
    { upsert: true }
  );

  return { suggestedQuestions: newQuestions };
};
