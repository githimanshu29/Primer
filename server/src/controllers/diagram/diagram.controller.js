import {
  generateTopicDiagramService,
  getTopicDiagramService,
  deleteTopicDiagramService,
} from "../../Agents/DiagramAgent/index.js";
import logger from "../../lib/logger.js";

export const generateTopicDiagram = async (req, res, next) => {
  try {
    const { courseId, chapterIndex, topicIndex } = req.params;
    const { userInstruction = "", provider = "gemini", model = "" } = req.body;

    logger.info(`API: User ${req.user._id} requested diagram for course:${courseId} ch:${chapterIndex} topic:${topicIndex}`);

    const diagram = await generateTopicDiagramService({
      courseId,
      chapterIndex,
      topicIndex,
      userInstruction,
      provider,
      model,
      user: req.user,
    });

    res.status(200).json({
      success: true,
      message: "Diagram generated successfully",
      diagram,
    });
  } catch (err) {
    logger.error(`generateTopicDiagram error: ${err.message}`);
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: err.message || "Failed to generate topic diagram",
      code: err.code || "GENERATION_FAILED",
    });
  }
};

export const getTopicDiagram = async (req, res, next) => {
  try {
    const { courseId, chapterIndex, topicIndex } = req.params;

    const diagram = await getTopicDiagramService({
      courseId,
      chapterIndex,
      topicIndex,
      user: req.user,
    });

    res.status(200).json({
      success: true,
      diagram: diagram || null,
    });
  } catch (err) {
    logger.error(`getTopicDiagram error: ${err.message}`);
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: err.message || "Failed to fetch topic diagram",
    });
  }
};

export const deleteTopicDiagram = async (req, res, next) => {
  try {
    const { courseId, chapterIndex, topicIndex } = req.params;

    const result = await deleteTopicDiagramService({
      courseId,
      chapterIndex,
      topicIndex,
      user: req.user,
    });

    res.status(200).json({
      success: true,
      message: "Topic diagram deleted successfully",
      deleted: result.deleted,
    });
  } catch (err) {
    logger.error(`deleteTopicDiagram error: ${err.message}`);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to delete topic diagram",
    });
  }
};
