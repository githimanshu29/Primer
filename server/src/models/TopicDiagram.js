import mongoose from "mongoose";

const topicDiagramSchema = new mongoose.Schema(
  {
    courseId: {
      type: String,
      required: true,
      index: true,
    },
    chapterIndex: {
      type: Number,
      required: true,
    },
    topicIndex: {
      type: Number,
      required: true,
    },
    topicName: {
      type: String,
      required: true,
    },
    diagramType: {
      type: String,
      enum: ["flowchart", "sequence", "architecture"],
      default: "flowchart",
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    specification: {
      type: Object,
      required: true,
    },
    mermaidCode: {
      type: String,
      required: true,
    },
    sourceRefs: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ["accepted", "draft", "failed"],
      default: "accepted",
    },
    evaluation: {
      passed: { type: Boolean, default: true },
      schemaPassed: { type: Boolean, default: true },
      syntaxPassed: { type: Boolean, default: true },
      groundingPassed: { type: Boolean, default: true },
      groundingScore: { type: Number, default: 100 },
      notes: { type: String, default: "" },
    },
    versions: {
      promptVersion: { type: String, default: "diagram-planner-v1" },
      schemaVersion: { type: String, default: "diagram-ir-v1" },
      provider: { type: String, default: "gemini" },
      model: { type: String, default: "gemini-3.5-flash-lite" },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

topicDiagramSchema.index(
  { courseId: 1, chapterIndex: 1, topicIndex: 1, createdBy: 1 },
  { unique: true }
);

const TopicDiagram = mongoose.model("TopicDiagram", topicDiagramSchema);

export default TopicDiagram;
