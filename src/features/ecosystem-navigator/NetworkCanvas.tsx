import { useMemo, useState, type ReactNode } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

// Generic decorative network canvas shared by all three Ecosystem Navigator
// altitudes — same library and radial-layout idiom as the existing
// /navigator screen's NavigatorGraph.tsx (React Flow, already a project
// dependency), simplified: read-only (no drag persistence, no onConnect),
// since every edge here is decorative per the session brief rather than an
// editable relationship.

export type CanvasNodeKind = "ecosystem" | "project" | "person" | "goal" | "objective" | "task";

export interface CanvasNode {
  id: string;
  kind: CanvasNodeKind;
  label: string;
  sublabel?: string;
  color: string;
  position: { x: number; y: number };
  onClick?: () => void;
  /** Ecosphere altitude's "details/metrics on hover" — rendered in a
   *  floating box above the node while hovered. */
  tooltip?: ReactNode;
}

export interface CanvasEdge {
  id: string;
  source: string;
  target: string;
}

function nodeSize(kind: CanvasNodeKind): number {
  if (kind === "ecosystem") return 110;
  if (kind === "project") return 84;
  if (kind === "goal" || kind === "objective") return 90;
  if (kind === "task") return 56;
  return 64;
}

function CircleNode({ data }: NodeProps) {
  const { label, sublabel, color, kind, onClick, tooltip } = data as unknown as CanvasNode;
  const size = nodeSize(kind);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position: "relative" }}
    >
      {hovered && tooltip && (
        <div
          role="tooltip"
          style={{
            position: "absolute",
            bottom: "calc(100% + 10px)",
            left: "50%",
            transform: "translateX(-50%)",
            width: 220,
            padding: "10px 12px",
            background: "var(--skin-surface)",
            border: "1px solid var(--skin-line)",
            borderRadius: 10,
            boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
            fontSize: 11.5,
            lineHeight: 1.5,
            color: "var(--skin-ink-soft)",
            zIndex: 20,
            pointerEvents: "none",
          }}
        >
          {tooltip}
        </div>
      )}
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: kind === "person" ? "var(--skin-surface)" : color,
          border: kind === "person" ? `2.5px solid ${color}` : "none",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: 8,
          boxSizing: "border-box",
          boxShadow: "0 2px 10px rgba(0,0,0,0.14)",
          cursor: onClick ? "pointer" : "default",
        }}
      >
        <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
        <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
        <span
          style={{
            fontSize: kind === "ecosystem" ? 12 : 10.5,
            fontWeight: 700,
            color: kind === "person" ? "var(--skin-ink)" : "#fff",
            lineHeight: 1.2,
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            wordBreak: "break-word",
          }}
        >
          {label}
        </span>
        {sublabel && (
          <span
            style={{
              fontSize: 9,
              marginTop: 2,
              color: kind === "person" ? "var(--skin-ink-faint)" : "rgba(255,255,255,0.85)",
            }}
          >
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}

const nodeTypes = { circle: CircleNode };

// Fixed dark palette (not the app's --skin-* theme tokens, which follow the
// user's light/dark preference) — the Founder Navigator's Network view wants
// an intentionally dark canvas regardless of theme (Obsidian/Kumu-style),
// distinct from Ecosystem Navigator's themed background. Reuses the same
// dark background already established as this app's "Nox" dark color
// (vite.config.ts PWA manifest background_color).
const DARK_CANVAS = {
  background: "#0d1117",
  dot: "#2a3138",
  controlsBg: "#161b22",
};

interface NetworkCanvasProps {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  /** Ecosystem Navigator's read-only decorative canvas keeps this false
   *  (default) — set true for a canvas where drag-to-reposition is itself a
   *  feature (Founder Navigator's Network view). */
  draggable?: boolean;
  /** "themed" (default) follows --skin-bg/--skin-line like the rest of the
   *  app; "dark" forces the fixed dark palette above regardless of the
   *  user's light/dark preference. */
  variant?: "themed" | "dark";
}

export function NetworkCanvas({
  nodes: canvasNodes,
  edges: canvasEdges,
  draggable = false,
  variant = "themed",
}: NetworkCanvasProps) {
  const isDark = variant === "dark";
  const nodes: Node[] = useMemo(
    () =>
      canvasNodes.map((n) => ({
        id: n.id,
        type: "circle",
        data: n as unknown as Record<string, unknown>,
        position: n.position,
        draggable,
        connectable: false,
      })),
    [canvasNodes, draggable],
  );

  const edges: Edge[] = useMemo(
    () =>
      canvasEdges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        style: { stroke: isDark ? DARK_CANVAS.dot : "var(--skin-line)", strokeWidth: 1.25 },
      })),
    [canvasEdges, isDark],
  );

  return (
    <div style={{ flex: 1, minHeight: 0 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        nodesDraggable={draggable}
        nodesConnectable={false}
        elementsSelectable={false}
        nodeOrigin={[0.5, 0.5]}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2}
        style={{ background: isDark ? DARK_CANVAS.background : "var(--skin-bg)" }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color={isDark ? DARK_CANVAS.dot : "var(--skin-line)"}
        />
        <Controls
          showInteractive={false}
          style={isDark ? { background: DARK_CANVAS.controlsBg } : undefined}
        />
        <MiniMap
          nodeColor={(n) => {
            const data = n.data as unknown as CanvasNode;
            return data.kind === "person" ? "var(--skin-line)" : data.color;
          }}
          maskColor="rgba(0,0,0,0.05)"
          style={{ background: isDark ? DARK_CANVAS.controlsBg : "var(--skin-surface)" }}
        />
      </ReactFlow>
    </div>
  );
}
