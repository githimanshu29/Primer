/**
 * Diagram Agent - Deterministic IR-to-Mermaid Compiler
 * Compiles a strictly validated diagram IR into safe, clean Mermaid DSL.
 */

export const compileIRToMermaid = (ir) => {
  if (!ir || typeof ir !== "object") {
    throw new Error("Invalid IR provided to compiler");
  }

  const { diagramType } = ir;

  if (diagramType === "sequence") {
    return compileSequenceDiagram(ir);
  }

  // Flowchart & Architecture
  return compileFlowchartDiagram(ir);
};

const compileFlowchartDiagram = (ir) => {
  const { direction = "TD", nodes = [], edges = [] } = ir;
  const lines = [`flowchart ${direction}`];

  // Helper to format node shape based on node kind
  const formatNode = (node) => {
    const { id, label, kind } = node;
    const safeLabel = `"${label.replace(/"/g, "'")}"`;

    switch (kind) {
      case "decision":
        return `${id}{${safeLabel}}:::decision`;
      case "database":
        return `${id}[(${safeLabel})]:::database`;
      case "subroutine":
        return `${id}[[${safeLabel}]]:::subroutine`;
      case "start":
      case "end":
        return `${id}([${safeLabel}]):::startEnd`;
      case "cloud":
        return `${id}>${safeLabel}]:::cloud`;
      default:
        return `${id}[${safeLabel}]:::process`;
    }
  };

  // Node declarations
  nodes.forEach((node) => {
    lines.push(`  ${formatNode(node)}`);
  });

  // Edge connections
  edges.forEach((edge) => {
    const { from, to, label, style } = edge;
    const isDotted = style === "dotted";

    if (label) {
      const safeLabel = label.replace(/"/g, "'");
      if (isDotted) {
        lines.push(`  ${from} -.->|${safeLabel}| ${to}`);
      } else {
        lines.push(`  ${from} -->|${safeLabel}| ${to}`);
      }
    } else {
      if (isDotted) {
        lines.push(`  ${from} -.-> ${to}`);
      } else {
        lines.push(`  ${from} --> ${to}`);
      }
    }
  });

  // Modern Dark-Mode Color Classes for visual aesthetics
  lines.push("");
  lines.push("  classDef process fill:#1e1b4b,stroke:#818cf8,stroke-width:1.5px,color:#e0e7ff;");
  lines.push("  classDef decision fill:#312e81,stroke:#c084fc,stroke-width:1.5px,color:#f5f3ff;");
  lines.push("  classDef database fill:#064e3b,stroke:#34d399,stroke-width:1.5px,color:#ecfdf5;");
  lines.push("  classDef startEnd fill:#4c1d95,stroke:#f472b6,stroke-width:1.5px,color:#fdf2f8;");
  lines.push("  classDef cloud fill:#0f172a,stroke:#38bdf8,stroke-width:1.5px,color:#e0f2fe;");
  lines.push("  classDef subroutine fill:#172554,stroke:#60a5fa,stroke-width:1.5px,color:#eff6ff;");

  return lines.join("\n");
};

const compileSequenceDiagram = (ir) => {
  const { participants = [], messages = [] } = ir;
  const lines = ["sequenceDiagram", "  autonumber"];

  // Participants
  participants.forEach((p) => {
    const keyword = p.isActor ? "actor" : "participant";
    const safeLabel = p.label ? ` as ${p.label.replace(/"/g, "'")}` : "";
    lines.push(`  ${keyword} ${p.id}${safeLabel}`);
  });

  // Messages
  messages.forEach((m) => {
    const { from, to, label = "", type } = m;
    const safeLabel = label.replace(/[:#]/g, "-").replace(/"/g, "'");

    switch (type) {
      case "reply":
        lines.push(`  ${from}-->>${to}: ${safeLabel}`);
        break;
      case "async":
        lines.push(`  ${from}-)${to}: ${safeLabel}`);
        break;
      default:
        lines.push(`  ${from}->>${to}: ${safeLabel}`);
        break;
    }
  });

  return lines.join("\n");
};
