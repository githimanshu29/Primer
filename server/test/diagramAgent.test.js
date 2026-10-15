import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  validateDiagramIR,
  sanitizeLabel,
} from "../src/Agents/DiagramAgent/diagram.schema.js";
import { compileIRToMermaid } from "../src/Agents/DiagramAgent/diagram.compiler.js";
import { validateMermaidSecurity } from "../src/Agents/DiagramAgent/diagram.validator.js";
import {
  evaluateInputSuitability,
  evaluateDiagram,
} from "../src/Agents/DiagramAgent/diagram.evaluator.js";

describe("DiagramAgent Test Suite", () => {
  // ── 1. Label Sanitization & Injection Defense ──
  describe("Label Sanitization", () => {
    it("should strip HTML tags and script injections from labels", () => {
      const malicious = 'Client <script>alert("xss")</script> <b>Bold</b>';
      const clean = sanitizeLabel(malicious);
      assert.equal(clean.includes("<script>"), false);
      assert.equal(clean.includes("</script>"), false);
      assert.equal(clean.includes("<b>"), false);
      assert.equal(clean, "Client alert('xss') Bold");
    });

    it("should strip unbalanced brackets and quotes that break Mermaid", () => {
      const broken = 'Node ["quoted"] {bracketed} (parentheses)';
      const clean = sanitizeLabel(broken);
      assert.equal(clean, "Node 'quoted' bracketed parentheses");
    });
  });

  // ── 2. IR Schema & Deterministic Validation ──
  describe("IR Schema Validation", () => {
    it("should successfully validate and sanitize a valid flowchart IR", () => {
      const rawIR = {
        schemaVersion: "diagram-ir-v1",
        diagramType: "flowchart",
        direction: "TD",
        title: "HTTP Request Lifecycle",
        description: "Standard HTTP roundtrip",
        nodes: [
          { id: "client", label: "Browser Client", kind: "start" },
          { id: "api_gateway", label: "API Gateway", kind: "process" },
          { id: "auth_service", label: "Auth Validator", kind: "decision" },
          { id: "database", label: "User DB", kind: "database" },
        ],
        edges: [
          { from: "client", to: "api_gateway", label: "GET /profile" },
          { from: "api_gateway", to: "auth_service", label: "Verify JWT" },
          { from: "auth_service", to: "database", label: "Lookup Record" },
        ],
      };

      const result = validateDiagramIR(rawIR);
      assert.equal(result.valid, true);
      assert.equal(result.sanitizedIR.nodes.length, 4);
      assert.equal(result.sanitizedIR.edges.length, 3);
    });

    it("should reject IR when edge references a non-existent node", () => {
      const invalidIR = {
        schemaVersion: "diagram-ir-v1",
        diagramType: "flowchart",
        title: "Broken Graph",
        nodes: [
          { id: "node_a", label: "Node A", kind: "process" },
          { id: "node_b", label: "Node B", kind: "process" },
        ],
        edges: [
          { from: "node_a", to: "non_existent_node", label: "Link" },
        ],
      };

      const result = validateDiagramIR(invalidIR);
      assert.equal(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes("non_existent_node")));
    });

    it("should reject IR with duplicate node IDs", () => {
      const dupIR = {
        schemaVersion: "diagram-ir-v1",
        diagramType: "flowchart",
        title: "Duplicate IDs",
        nodes: [
          { id: "duplicate_id", label: "First", kind: "process" },
          { id: "duplicate_id", label: "Second", kind: "process" },
        ],
        edges: [{ from: "duplicate_id", to: "duplicate_id", label: "Loop" }],
      };

      const result = validateDiagramIR(dupIR);
      assert.equal(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes("Duplicate node ID")));
    });

    it("should reject IR exceeding maximum node complexity limits (> 15 nodes)", () => {
      const nodes = Array.from({ length: 20 }, (_, i) => ({
        id: `node_${i}`,
        label: `Label ${i}`,
        kind: "process",
      }));
      const edges = [{ from: "node_0", to: "node_1", label: "Step" }];

      const result = validateDiagramIR({
        diagramType: "flowchart",
        title: "Too Many Nodes",
        nodes,
        edges,
      });

      assert.equal(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes("maximum complexity limit")));
    });

    it("should successfully validate sequence diagram IR", () => {
      const seqIR = {
        schemaVersion: "diagram-ir-v1",
        diagramType: "sequence",
        title: "Login Sequence",
        participants: [
          { id: "User", label: "End User", isActor: true },
          { id: "AuthServer", label: "OAuth Server", isActor: false },
        ],
        messages: [
          { from: "User", to: "AuthServer", label: "Submit Credentials", type: "sync" },
          { from: "AuthServer", to: "User", label: "Issue Token", type: "reply" },
        ],
      };

      const result = validateDiagramIR(seqIR);
      assert.equal(result.valid, true);
      assert.equal(result.sanitizedIR.participants.length, 2);
      assert.equal(result.sanitizedIR.messages.length, 2);
    });
  });

  // ── 3. Deterministic IR-to-Mermaid Compilation ──
  describe("IR-to-Mermaid Compiler", () => {
    it("should compile flowchart IR with proper shapes and class definitions", () => {
      const ir = {
        diagramType: "flowchart",
        direction: "TD",
        title: "Test Compiler",
        nodes: [
          { id: "start_node", label: "Start Flow", kind: "start" },
          { id: "decision_node", label: "Check Value", kind: "decision" },
          { id: "db_node", label: "SQL Table", kind: "database" },
        ],
        edges: [
          { from: "start_node", to: "decision_node", label: "Proceed", style: "solid" },
          { from: "decision_node", to: "db_node", label: "Save", style: "dotted" },
        ],
      };

      const mermaid = compileIRToMermaid(ir);
      assert.ok(mermaid.startsWith("flowchart TD"));
      assert.ok(mermaid.includes("start_node([\"Start Flow\"]):::startEnd"));
      assert.ok(mermaid.includes("decision_node{\"Check Value\"}:::decision"));
      assert.ok(mermaid.includes("db_node[(\"SQL Table\")]:::database"));
      assert.ok(mermaid.includes("start_node -->|Proceed| decision_node"));
      assert.ok(mermaid.includes("decision_node -.->|Save| db_node"));
      assert.ok(mermaid.includes("classDef process"));
      assert.ok(mermaid.includes("classDef database"));
    });

    it("should compile sequence diagram IR with participants and message arrows", () => {
      const seqIR = {
        diagramType: "sequence",
        title: "Test Sequence",
        participants: [
          { id: "Alice", label: "Alice", isActor: true },
          { id: "Bob", label: "Bob", isActor: false },
        ],
        messages: [
          { from: "Alice", to: "Bob", label: "Ping", type: "sync" },
          { from: "Bob", to: "Alice", label: "Pong", type: "reply" },
        ],
      };

      const mermaid = compileIRToMermaid(seqIR);
      assert.ok(mermaid.includes("sequenceDiagram"));
      assert.ok(mermaid.includes("actor Alice as Alice"));
      assert.ok(mermaid.includes("participant Bob as Bob"));
      assert.ok(mermaid.includes("Alice->>Bob: Ping"));
      assert.ok(mermaid.includes("Bob-->>Alice: Pong"));
    });
  });

  // ── 4. Mermaid Security Validator ──
  describe("Mermaid Security Validator", () => {
    it("should reject malicious click directives", () => {
      const dangerous = `flowchart TD
  A[Node] --> B[Target]
  click A callbackFunction`;

      const result = validateMermaidSecurity(dangerous);
      assert.equal(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes("Forbidden directive")));
    });

    it("should reject script tags and href attributes", () => {
      const dangerous = `flowchart TD
  A["<script>alert(1)</script>"] --> B
  A href="javascript:attack()"`;

      const result = validateMermaidSecurity(dangerous);
      assert.equal(result.valid, false);
    });

    it("should accept valid, clean Mermaid code", () => {
      const safe = `flowchart TD
  A["Client"] -->|Request| B["Server"]
  B --> C[("Database")]`;

      const result = validateMermaidSecurity(safe);
      assert.equal(result.valid, true);
    });
  });

  // ── 5. Evaluation Layer ──
  describe("Diagram Evaluator", () => {
    it("should reject topics with insufficient content", () => {
      const result = evaluateInputSuitability("", "");
      assert.equal(result.suitable, false);

      const briefResult = evaluateInputSuitability("X", "Short");
      assert.equal(briefResult.suitable, false);
    });

    it("should evaluate and pass a well-grounded diagram", () => {
      const topicText = "PostgreSQL is a relational database management system using SQL queries to persist data.";
      const ir = {
        diagramType: "flowchart",
        title: "PostgreSQL Architecture",
        nodes: [
          { id: "app", label: "Web App SQL Query", kind: "process" },
          { id: "postgres", label: "PostgreSQL Relational Database", kind: "database" },
        ],
        edges: [{ from: "app", to: "postgres", label: "Execute Query" }],
      };
      const mermaidCode = compileIRToMermaid(ir);

      const evalResult = evaluateDiagram({
        ir,
        mermaidCode,
        canonicalTopicText: topicText,
      });

      assert.equal(evalResult.passed, true);
      assert.equal(evalResult.schemaPassed, true);
      assert.equal(evalResult.syntaxPassed, true);
      assert.equal(evalResult.groundingPassed, true);
      assert.ok(evalResult.groundingScore > 50);
    });
  });
});
