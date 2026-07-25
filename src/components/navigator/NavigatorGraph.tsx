import { useRef, useEffect, useState } from "react";
import { Share2 } from "lucide-react";
import { useAuth } from "@/contexts/auth";
import { useActiveProject } from "@/contexts/active-project";
import { useObjectives, type ObjectiveRow } from "@/lib/navigator-api";

const COLS = 4;
const COL_W = 180;
const ROW_H = 130;
const NODE_X_OFFSET = 100;
const NODE_Y_OFFSET = 90;

function nodePos(i: number) {
  return {
    x: NODE_X_OFFSET + (i % COLS) * COL_W,
    y: NODE_Y_OFFSET + Math.floor(i / COLS) * ROW_H,
  };
}

function statusColor(status: string | null): string {
  switch (status) {
    case "active": return "var(--skin-accent)";
    case "completed": return "#22c55e";
    case "inactive": return "var(--skin-ink-faint)";
    default: return "var(--skin-accent)";
  }
}

export function NavigatorGraph() {
  const { user } = useAuth();
  const { activeProjectId } = useActiveProject();
  const { data: allObjectives = [], isLoading } = useObjectives(user, activeProjectId);
  const objectives = allObjectives.filter((o) => o.title !== "__general__");

  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 800, h: 500 });
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      setDims({ w: rect.width, h: rect.height });
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  if (!activeProjectId) {
    return (
      <EmptyState>
        <p style={{ fontSize: 15, color: "var(--skin-ink-soft)", marginBottom: 6 }}>No project selected.</p>
        <p style={{ fontSize: 13, color: "var(--skin-ink-faint)" }}>
          Pick a project from the sidebar to view the graph.
        </p>
      </EmptyState>
    );
  }

  if (isLoading) {
    return (
      <EmptyState>
        <p style={{ fontSize: 13, color: "var(--skin-ink-faint)" }}>Loading…</p>
      </EmptyState>
    );
  }

  if (objectives.length === 0) {
    return (
      <EmptyState>
        <div
          style={{
            width: 48, height: 48, borderRadius: 14,
            background: "var(--skin-accent-faint, rgba(78,193,211,0.1))",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 12px",
          }}
        >
          <Share2 size={22} style={{ color: "var(--skin-accent)" }} />
        </div>
        <p style={{ fontSize: 15, color: "var(--skin-ink-soft)", marginBottom: 4 }}>No objectives yet</p>
        <p style={{ fontSize: 13, color: "var(--skin-ink-faint)" }}>
          Add objectives in the Browser view to see them here.
        </p>
      </EmptyState>
    );
  }

  const rows = Math.ceil(objectives.length / COLS);
  const svgW = Math.max(dims.w, NODE_X_OFFSET + COLS * COL_W + 60);
  const svgH = Math.max(dims.h, NODE_Y_OFFSET + rows * ROW_H + 60);

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        overflow: "auto",
        background: "var(--skin-bg)",
        position: "relative",
      }}
    >
      <svg
        width={svgW}
        height={svgH}
        style={{ display: "block" }}
      >
        {/* Edges: connect consecutive objectives */}
        {objectives.slice(0, -1).map((_, i) => {
          const a = nodePos(i);
          const b = nodePos(i + 1);
          return (
            <line
              key={`edge-${i}`}
              x1={a.x} y1={a.y}
              x2={b.x} y2={b.y}
              stroke="var(--skin-line)"
              strokeWidth="1.5"
              strokeDasharray="4 3"
            />
          );
        })}

        {/* Nodes */}
        {objectives.map((obj, i) => {
          const { x, y } = nodePos(i);
          const color = statusColor(obj.status);
          const isHovered = hovered === obj.id;
          const progress = obj.tasksCount > 0
            ? Math.round((obj.completedTasksCount / obj.tasksCount) * 100)
            : null;

          return (
            <g
              key={obj.id}
              style={{ cursor: "pointer" }}
              onMouseEnter={() => setHovered(obj.id)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* Shadow circle */}
              <circle
                cx={x} cy={y} r={isHovered ? 37 : 34}
                fill={color}
                opacity={isHovered ? 0.15 : 0.08}
                style={{ transition: "r 0.15s, opacity 0.15s" }}
              />
              {/* Main circle */}
              <circle
                cx={x} cy={y} r={28}
                fill="var(--skin-surface)"
                stroke={color}
                strokeWidth={isHovered ? 2.5 : 1.5}
                style={{ transition: "stroke-width 0.15s" }}
              />
              {/* Title */}
              <foreignObject
                x={x - 52} y={y - 18}
                width={104} height={36}
                style={{ overflow: "visible" }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: "var(--skin-ink)",
                    textAlign: "center",
                    lineHeight: 1.25,
                    wordBreak: "break-word",
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {obj.title.slice(0, 40)}
                </div>
              </foreignObject>
              {/* Status label below node */}
              <text
                x={x} y={y + 42}
                textAnchor="middle"
                fontSize={9}
                fill="var(--skin-ink-faint)"
                fontWeight={500}
                style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}
              >
                {(obj.status ?? "draft").replace("_", " ")}
              </text>
              {/* Task count badge */}
              {obj.tasksCount > 0 && (
                <text
                  x={x} y={y + 53}
                  textAnchor="middle"
                  fontSize={9}
                  fill={color}
                >
                  {obj.completedTasksCount}/{obj.tasksCount} tasks{progress !== null ? ` · ${progress}%` : ""}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: 32,
        background: "var(--skin-bg)",
      }}
    >
      <div>{children}</div>
    </div>
  );
}
