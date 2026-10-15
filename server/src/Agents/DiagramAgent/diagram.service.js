/**
 * Diagram Agent - Service Orchestration Layer
 * Manages authorization, topic retrieval, planning, compilation, evaluation, and persistence.
 */

import Course from "../../models/Course.js";
import TopicDiagram from "../../models/TopicDiagram.js";
import Enrollment from "../../models/Enrollment.js";
import { evaluateInputSuitability, evaluateDiagram } from "./diagram.evaluator.js";
import { planDiagramWithModel } from "./diagram.planner.js";
import { compileIRToMermaid } from "./diagram.compiler.js";
import { retrieveRelevantChunks } from "../../lib/langchain/vectorStore.js";
import logger from "../../lib/logger.js";

// Check if user has permission to access this course
export const verifyCourseAccess = async (courseId, user) => {
  const course = await Course.findOne({ cid: courseId });
  if (!course) {
    return { authorized: false, status: 404, message: "Course not found", course: null };
  }

  // Admin access
  if (user?.role === "admin" || user?.isAdmin) {
    return { authorized: true, course };
  }

  // Course owner
  if (course.createdBy && course.createdBy.toString() === user._id.toString()) {
    return { authorized: true, course };
  }

  // Public Preview Course
  if (course.previewCourse) {
    return { authorized: true, course };
  }

  // Check enrollment
  const enrollment = await Enrollment.findOne({
    $or: [{ cid: courseId }, { courseId: course._id }],
    userId: user._id,
  });

  if (enrollment) {
    return { authorized: true, course };
  }

  return { authorized: false, status: 403, message: "Access denied to this course", course: null };
};

export const generateTopicDiagramService = async ({
  courseId,
  chapterIndex,
  topicIndex,
  userInstruction = "",
  provider = "gemini",
  model = "",
  user,
}) => {
  // 1. Authorize access
  const access = await verifyCourseAccess(courseId, user);
  if (!access.authorized) {
    const error = new Error(access.message);
    error.statusCode = access.status;
    throw error;
  }

  const { course } = access;

  // 2. Resolve canonical chapter & topic from course data
  const chIdx = parseInt(chapterIndex, 10);
  const tIdx = parseInt(topicIndex, 10);

  const chapterLayout = course.courseJson?.chapters?.[chIdx];
  const chapterName = chapterLayout?.chapterName || `Chapter ${chIdx + 1}`;
  const topicName = chapterLayout?.topics?.[tIdx] || `Topic ${tIdx + 1}`;

  // Content from built chapter if ready
  const chapterBuilt = course.courseContent?.[chIdx];
  const topicContentObj = chapterBuilt?.courseData?.content?.[tIdx];
  const topicContent = topicContentObj?.htmlContent || topicName;

  // 3. Evaluate input suitability
  const suitability = evaluateInputSuitability(topicName, topicContent);
  if (!suitability.suitable) {
    const error = new Error(suitability.reason);
    error.statusCode = 422;
    error.code = "INSUFFICIENT_CONTEXT";
    throw error;
  }

  // 4. Retrieve prior context chunks via RAG if vector store has prior chapter embeddings
  let priorContextChunks = [];
  if (chIdx > 0) {
    try {
      priorContextChunks = await retrieveRelevantChunks({
        courseId,
        userId: course.createdBy || user._id,
        query: `${topicName} ${chapterName}`,
        currentChapterIndex: chIdx,
        topK: 3,
      });
    } catch (ragErr) {
      logger.warn(`DiagramAgent: RAG retrieval failed: ${ragErr.message}. Continuing with topic content.`);
    }
  }

  // 5. User custom API key if BYOK provided
  const userApiKey = user?.apiKeys?.[provider];

  // 6. Plan diagram with Gemini or Groq
  const planResult = await planDiagramWithModel({
    courseName: course.name,
    chapterName,
    topicName,
    topicContent,
    priorContextChunks,
    userInstruction,
    provider,
    model,
    apiKey: userApiKey,
  });

  if (!planResult.success) {
    const error = new Error(planResult.error || "Failed to generate valid diagram specification");
    error.statusCode = 422;
    error.code = "DIAGRAM_VALIDATION_FAILED";
    throw error;
  }

  const ir = planResult.ir;

  // 7. Compile IR to Mermaid DSL
  let mermaidCode;
  try {
    mermaidCode = compileIRToMermaid(ir);
  } catch (compErr) {
    const error = new Error(`Mermaid compilation failed: ${compErr.message}`);
    error.statusCode = 500;
    error.code = "DIAGRAM_COMPILE_FAILED";
    throw error;
  }

  // 8. Run evaluation layer
  const evaluation = evaluateDiagram({
    ir,
    mermaidCode,
    canonicalTopicText: topicContent,
  });

  if (!evaluation.passed) {
    logger.warn(`DiagramAgent: Evaluation flagged notes: ${evaluation.notes}`);
  }

  // 9. Persist accepted diagram in MongoDB
  const savedDiagram = await TopicDiagram.findOneAndUpdate(
    {
      courseId,
      chapterIndex: chIdx,
      topicIndex: tIdx,
      createdBy: user._id,
    },
    {
      courseId,
      chapterIndex: chIdx,
      topicIndex: tIdx,
      topicName,
      diagramType: ir.diagramType || "flowchart",
      title: ir.title || `${topicName} Architecture`,
      description: ir.description || "",
      specification: ir,
      mermaidCode,
      sourceRefs: ir.nodes?.flatMap((n) => n.sourceRefs || []) || [],
      status: evaluation.passed ? "accepted" : "draft",
      evaluation,
      versions: {
        promptVersion: "diagram-planner-v1",
        schemaVersion: "diagram-ir-v1",
        provider,
        model: model || (provider === "gemini" ? "gemini-3.5-flash-lite" : "llama-3.3-70b-versatile"),
      },
      createdBy: user._id,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  logger.info(`DiagramAgent: Diagram successfully saved for course:${courseId} ch:${chIdx} topic:${tIdx}`);

  return savedDiagram;
};

export const getTopicDiagramService = async ({ courseId, chapterIndex, topicIndex, user }) => {
  const access = await verifyCourseAccess(courseId, user);
  if (!access.authorized) {
    const error = new Error(access.message);
    error.statusCode = access.status;
    throw error;
  }

  const chIdx = parseInt(chapterIndex, 10);
  const tIdx = parseInt(topicIndex, 10);

  // First check if user has a generated diagram
  let diagram = await TopicDiagram.findOne({
    courseId,
    chapterIndex: chIdx,
    topicIndex: tIdx,
    createdBy: user._id,
  });

  // If not found, check if a course creator diagram exists for this topic (e.g. for preview courses or shared)
  if (!diagram) {
    diagram = await TopicDiagram.findOne({
      courseId,
      chapterIndex: chIdx,
      topicIndex: tIdx,
    });
  }

  return diagram;
};

export const deleteTopicDiagramService = async ({ courseId, chapterIndex, topicIndex, user }) => {
  const chIdx = parseInt(chapterIndex, 10);
  const tIdx = parseInt(topicIndex, 10);

  const deleted = await TopicDiagram.findOneAndDelete({
    courseId,
    chapterIndex: chIdx,
    topicIndex: tIdx,
    createdBy: user._id,
  });

  return { success: true, deleted: Boolean(deleted) };
};
