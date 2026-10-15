/**
 * Diagram Agent - Typed Intermediate Representation (IR) Schema & Validator
 */

const ALLOWED_DIAGRAM_TYPES = ["flowchart", "sequence", "architecture"];
const ALLOWED_NODE_KINDS = [
  "process",
  "decision",
  "start",
  "end",
  "database",
  "subroutine",
  "actor",
  "component",
  "cloud",
];
const ALLOWED_MESSAGE_TYPES = ["sync", "async", "reply"];
const ID_REGEX = /^[a-zA-Z0-9_]{1,32}$/;

// Sanitize strings against Mermaid syntax breaking characters and HTML injection
export const sanitizeLabel = (str = "") => {
  if (typeof str !== "string") return "";
  return str
    .replace(/<[^>]*>/g, "") // strip all HTML tags
    .replace(/["`]/g, "'") // replace quotes and backticks with single quotes
    .replace(/[[\]{}()]/g, "") // strip unbalanced brackets
    .replace(/[\r\n\t]+/g, " ") // replace newlines with space
    .trim()
    .slice(0, 80);
};

export const validateDiagramIR = (raw) => {
  const errors = [];

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { valid: false, errors: ["Diagram IR must be a valid JSON object"], sanitizedIR: null };
  }

  // Schema version
  const schemaVersion = raw.schemaVersion || "diagram-ir-v1";

  // Diagram Type
  const diagramType = (raw.diagramType || "flowchart").toLowerCase();
  if (!ALLOWED_DIAGRAM_TYPES.includes(diagramType)) {
    errors.push(`Unsupported diagramType: "${raw.diagramType}". Allowed: ${ALLOWED_DIAGRAM_TYPES.join(", ")}`);
  }

  // Title & Description
  const title = sanitizeLabel(raw.title || "Topic Overview").slice(0, 100);
  if (!title) {
    errors.push("Diagram title is required");
  }

  const description = typeof raw.description === "string" ? raw.description.replace(/<[^>]*>/g, "").slice(0, 300) : "";

  // ── SEQUENCE DIAGRAM VALIDATION ──
  if (diagramType === "sequence") {
    const rawParticipants = Array.isArray(raw.participants) ? raw.participants : [];
    const rawMessages = Array.isArray(raw.messages) ? raw.messages : [];

    if (rawParticipants.length < 2) {
      errors.push("Sequence diagram requires at least 2 participants");
    }
    if (rawParticipants.length > 8) {
      errors.push("Sequence diagram exceeds maximum limit of 8 participants");
    }
    if (rawMessages.length < 1) {
      errors.push("Sequence diagram requires at least 1 message");
    }
    if (rawMessages.length > 20) {
      errors.push("Sequence diagram exceeds maximum limit of 20 messages");
    }

    const participantIds = new Set();
    const sanitizedParticipants = [];

    for (let i = 0; i < rawParticipants.length; i++) {
      const p = rawParticipants[i];
      const id = String(p.id || `P${i + 1}`).replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 32);

      if (!ID_REGEX.test(id)) {
        errors.push(`Participant ID "${id}" is invalid. Alphanumeric and underscore only.`);
      }
      if (participantIds.has(id)) {
        errors.push(`Duplicate participant ID: "${id}"`);
      }
      participantIds.add(id);

      sanitizedParticipants.push({
        id,
        label: sanitizeLabel(p.label || id),
        isActor: Boolean(p.isActor || p.actor),
      });
    }

    const sanitizedMessages = [];
    for (let i = 0; i < rawMessages.length; i++) {
      const m = rawMessages[i];
      const from = String(m.from || "").trim();
      const to = String(m.to || "").trim();

      if (!participantIds.has(from)) {
        errors.push(`Message ${i + 1} sender "${from}" does not exist in participants`);
      }
      if (!participantIds.has(to)) {
        errors.push(`Message ${i + 1} recipient "${to}" does not exist in participants`);
      }

      const type = ALLOWED_MESSAGE_TYPES.includes(m.type) ? m.type : "sync";
      sanitizedMessages.push({
        from,
        to,
        label: sanitizeLabel(m.label || "message"),
        type,
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      sanitizedIR: {
        schemaVersion,
        diagramType,
        title,
        description,
        participants: sanitizedParticipants,
        messages: sanitizedMessages,
      },
    };
  }

  // ── FLOWCHART & ARCHITECTURE VALIDATION ──
  const direction = raw.direction === "LR" ? "LR" : "TD";
  const rawNodes = Array.isArray(raw.nodes) ? raw.nodes : [];
  const rawEdges = Array.isArray(raw.edges) ? raw.edges : [];

  if (rawNodes.length < 2) {
    errors.push("Diagram requires at least 2 nodes");
  }
  if (rawNodes.length > 15) {
    errors.push("Diagram exceeds maximum complexity limit of 15 nodes");
  }
  if (rawEdges.length < 1) {
    errors.push("Diagram requires at least 1 connecting edge");
  }
  if (rawEdges.length > 25) {
    errors.push("Diagram exceeds maximum limit of 25 edges");
  }

  const nodeIds = new Set();
  const sanitizedNodes = [];

  for (let i = 0; i < rawNodes.length; i++) {
    const node = rawNodes[i];
    const id = String(node.id || `node_${i + 1}`).replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 32);

    if (!ID_REGEX.test(id)) {
      errors.push(`Node ID "${id}" is invalid. Alphanumeric and underscore only.`);
    }
    if (nodeIds.has(id)) {
      errors.push(`Duplicate node ID detected: "${id}"`);
    }
    nodeIds.add(id);

    const kind = ALLOWED_NODE_KINDS.includes(node.kind) ? node.kind : "process";
    sanitizedNodes.push({
      id,
      label: sanitizeLabel(node.label || id),
      kind,
      sourceRefs: Array.isArray(node.sourceRefs) ? node.sourceRefs.map(String).slice(0, 5) : [],
    });
  }

  const sanitizedEdges = [];
  const edgeKeys = new Set();

  for (let i = 0; i < rawEdges.length; i++) {
    const edge = rawEdges[i];
    const from = String(edge.from || "").trim();
    const to = String(edge.to || "").trim();

    if (!nodeIds.has(from)) {
      errors.push(`Edge ${i + 1} "from" node "${from}" is not defined in nodes`);
    }
    if (!nodeIds.has(to)) {
      errors.push(`Edge ${i + 1} "to" node "${to}" is not defined in nodes`);
    }

    const key = `${from}->${to}`;
    if (edgeKeys.has(key)) {
      // Duplicate edge, omit or permit if label differs
    }
    edgeKeys.add(key);

    sanitizedEdges.push({
      from,
      to,
      label: sanitizeLabel(edge.label || ""),
      style: edge.style === "dotted" ? "dotted" : "solid",
      sourceRefs: Array.isArray(edge.sourceRefs) ? edge.sourceRefs.map(String).slice(0, 5) : [],
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitizedIR: {
      schemaVersion,
      diagramType,
      direction,
      title,
      description,
      nodes: sanitizedNodes,
      edges: sanitizedEdges,
    },
  };
};
