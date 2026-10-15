/**
 * Topic Conversation Controller
 * Handles HTTP requests for loading, sending, and clearing topic-scoped discussions.
 */

import {
  getTopicConversationService,
  sendTopicMessageService,
  clearTopicConversationService,
  refreshSuggestedQuestionsService,
} from "../../Agents/TopicConversationAgent/index.js";
import logger from "../../lib/logger.js";

export const getTopicConversation = async (req, res, next) => {
  try {
    const { courseId, chapterIndex, topicIndex } = req.params;
    const { provider, model } = req.query;

    const result = await getTopicConversationService({
      courseId,
      chapterIndex,
      topicIndex,
      user: req.user,
      provider: provider || req.user.defaultProvider || "gemini",
      model: model || req.user.defaultModel || "",
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error(`getTopicConversation error: ${error.message}`);
    next(error);
  }
};

export const sendTopicMessage = async (req, res, next) => {
  try {
    const { courseId, chapterIndex, topicIndex } = req.params;
    const { message, requestDiagram, provider, model } = req.body;

    const result = await sendTopicMessageService({
      courseId,
      chapterIndex,
      topicIndex,
      message,
      requestDiagram: Boolean(requestDiagram),
      provider: provider || req.user.defaultProvider || "gemini",
      model: model || req.user.defaultModel || "",
      user: req.user,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error(`sendTopicMessage error: ${error.message}`);
    next(error);
  }
};

export const clearTopicConversation = async (req, res, next) => {
  try {
    const { courseId, chapterIndex, topicIndex } = req.params;

    const result = await clearTopicConversationService({
      courseId,
      chapterIndex,
      topicIndex,
      user: req.user,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error(`clearTopicConversation error: ${error.message}`);
    next(error);
  }
};

export const refreshSuggestedQuestions = async (req, res, next) => {
  try {
    const { courseId, chapterIndex, topicIndex } = req.params;
    const { provider, model } = req.body;

    const result = await refreshSuggestedQuestionsService({
      courseId,
      chapterIndex,
      topicIndex,
      user: req.user,
      provider: provider || req.user.defaultProvider || "gemini",
      model: model || req.user.defaultModel || "",
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error(`refreshSuggestedQuestions error: ${error.message}`);
    next(error);
  }
};
