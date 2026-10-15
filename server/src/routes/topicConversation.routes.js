import express from "express";
import {
  getTopicConversation,
  sendTopicMessage,
  clearTopicConversation,
  refreshSuggestedQuestions,
} from "../controllers/chat/topicConversation.controller.js";
import { protect } from "../middleware/auth.js";
import { aiLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

// Fetch or initialize persistent conversation for a topic
router.get(
  "/:courseId/chapters/:chapterIndex/topics/:topicIndex",
  protect,
  getTopicConversation
);

// Send message to discuss topic / ask doubts / request diagrams
router.post(
  "/:courseId/chapters/:chapterIndex/topics/:topicIndex/messages",
  protect,
  aiLimiter,
  sendTopicMessage
);

// Regenerate starter questions for a topic
router.post(
  "/:courseId/chapters/:chapterIndex/topics/:topicIndex/suggestions",
  protect,
  aiLimiter,
  refreshSuggestedQuestions
);

// Clear/reset discussion history
router.delete(
  "/:courseId/chapters/:chapterIndex/topics/:topicIndex",
  protect,
  clearTopicConversation
);

export default router;
