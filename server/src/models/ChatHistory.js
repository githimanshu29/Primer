import mongoose from "mongoose";

const messageMetadataSchema = new mongoose.Schema(
  {
    intent: {
      type: String,
      enum: ["answer", "example", "simplify", "diagram", "clarify"],
      default: "answer",
    },
    sourceRefs: {
      type: [String],
      default: [],
    },
    diagramRequested: {
      type: Boolean,
      default: false,
    },
    diagramId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TopicDiagram",
      default: null,
    },
    diagramTitle: {
      type: String,
      default: "",
    },
    evaluationStatus: {
      type: String,
      enum: ["passed", "flagged"],
      default: "passed",
    },
    evaluationNotes: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema({
  messageId: {
    type: String,
    required: true,
    default: () => new mongoose.Types.ObjectId().toString(),
  },
  role: {
    type: String,
    enum: ["user", "assistant"],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  metadata: {
    type: messageMetadataSchema,
    default: () => ({}),
  },
});

const chatHistorySchema = new mongoose.Schema(
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
    topic: {
      type: String,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    messages: {
      type: [messageSchema],
      default: [],
    },
    suggestedQuestions: {
      type: [String],
      default: [],
    },
    sessionCount: {
      type: Number,
      default: 1,
    },
    lastActive: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Compound unique index ensuring one durable conversation per user per topic in a course
chatHistorySchema.index(
  { courseId: 1, chapterIndex: 1, topicIndex: 1, userId: 1 },
  { unique: true }
);

const ChatHistory = mongoose.model("ChatHistory", chatHistorySchema);

export default ChatHistory;