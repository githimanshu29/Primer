import express from "express";
import {
  generateTopicDiagram,
  getTopicDiagram,
  deleteTopicDiagram,
} from "../controllers/diagram/diagram.controller.js";
import { protect } from "../middleware/auth.js";
import { aiLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

// Generate diagram on-demand for a topic
router.post(
  "/:courseId/chapters/:chapterIndex/topics/:topicIndex/generate",
  protect,
  aiLimiter,
  generateTopicDiagram
);

// Fetch saved diagram for a topic
router.get(
  "/:courseId/chapters/:chapterIndex/topics/:topicIndex",
  protect,
  getTopicDiagram
);

// Delete/reset diagram for a topic
router.delete(
  "/:courseId/chapters/:chapterIndex/topics/:topicIndex",
  protect,
  deleteTopicDiagram
);

export default router;
