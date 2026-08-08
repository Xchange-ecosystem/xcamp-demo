import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GraphEdge, GraphNode, ItemKind } from "@/lib/sidepanel-service";

// ── Pure force simulation (no external deps) ──────────────────────────────

interface LayoutNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

function runForceSimulation(
  nodes: GraphNode[],
  edges: GraphEdge[],
  centerId: string,
  w: number,
  h: number,
): LayoutNode[] {
  if (!nodes.length) return [];
  const cx = w / 2;
  const cy = h / 2;
  const nonCenter = nodes.filter((n) => n.id !== centerId);
  const total = nonCenter.length;

  const layout: LayoutNode[] = nodes.map((n, i) => {
    if (n.id === centerId) return { ...n, x: cx, y: cy, vx: 0, vy: 0 };
    const idx = nonCenter.indexOf(n);
    const angle = total > 1 ? (2 * Math.PI * idx) / total - Math.PI / 2 : 0;
    const r = Math.min(w, h) * 0.33;
    return { ...n, x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle), vx: 0, vy: 0 };
  });

  const byId = new Map(layout.map((n) => [n.id, n]));
  const REPEL = 2800;
  const LINK_DIST = 110;
  const CENTER_K = 0.04;
  const ALPHA_DECAY = 0.06;
  const PAD = 24;

  let alpha = 1;
  for (let iter = 0; iter < 100; iter++) {
    alpha *= 1 - ALPHA_DECAY;
    if (alpha < 0.002) break;

    // Repulsion
    for (let i = 0; i < layout.length; i++) {
      for (let j = i + 1; j < layout.length; j++) {
        const a = layout[i];
        const b = layout[j];
        const dx = b.x - a.x || 0.1;
        const dy = b.y - a.y || 0.1;
        const d2 = dx * dx + dy * dy;
        const f = (REPEL / d2) * alpha;
        const d = Math.sqrt(d2);
        a.vx -= (dx / d) * f;
        a.vy -= (dy / d) * f;
        b.vx += (dx / d) * f;
        b.vy += (dy / d) * f;
      }
    }

    // Link spring
    for (const e of edges) {
      const a = byId.get(e.source);
      const b = byId.get(e.target);
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const f = ((d - LINK_DIST) / d) * alpha * 0.35;
      a.vx += dx * f;
      a.vy += dy * f;
      b.vx -= dx * f;
      b.vy -= dy * f;
    }

    // Center gravity
    for (const n of layout) {
      n.vx += (cx - n.x) * CENTER_K * alpha;
      n.vy += (cy - n.y) * CENTER_K * alpha;
    }

    // Pin center node
    const center = byId.get(centerId);
    if (center) {
      center.vx = 0;
      center.vy = 0;
    }

    // Apply + damp + clamp
    for (const n of layout) {
      n.x += n.vx;
      n.y += n.vy;
      n.vx *= 0.65;
      n.vy *= 0.65;
      n.x = Math.max(PAD, Math.min(w - PAD, n.x));
      n.y = Math.max(PAD, Math.min(h - PAD, n.y));
    }
  }

  return layout;
}

// ── Component ──────────────────────────────────────────────────────────────

interface ItemGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  centerId: string;
  onOpenItem: (id: string, kind: ItemKind) => void;
}

export function ItemGraph({ nodes, edges, centerId, onOpenItem }: ItemGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 400, h: 280 });
  const [hovered, setHovered] = useState<string | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const isDragging = useRef(false);
  const dragOrigin = useRef({ x: 0, y: 0 });
  const panRef = useRef(pan);
  panRef.current = pan;

  const prefersReduced = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setDims({ w: Math.max(200, width), h: Math.max(180, height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const layout = useMemo(
    () => runForceSimulation(nodes, edges, centerId, dims.w, dims.h),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nodes.map((n) => n.id).join(), edges.map((e) => e.source + e.target).join(), centerId, dims.w, dims.h],
  );

  const byId = useMemo(() => new Map(layout.map((n) => [n.id, n])), [layout]);

  const maxDeg = useMemo(() => Math.max(1, ...nodes.map((n) => n.degree)), [nodes]);
  const radius = (n: GraphNode) => (n.id === centerId ? 14 : 5 + (n.degree / maxDeg) * 9);

  const connectedTo = useMemo(() => {
    if (!hovered) return null;
    const s = new Set([hovered]);
    for (const e of edges) {
      if (e.source === hovered) s.add(e.target);
      if (e.target === hovered) s.add(e.source);
    }
    return s;
  }, [hovered, edges]);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    setScale((s) => Math.min(3, Math.max(0.25, s * factor)));
  }, []);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest("circle,text")) return;
      isDragging.current = true;
      dragOrigin.current = { x: e.clientX - panRef.current.x, y: e.clientY - panRef.current.y };
    },
    [],
  );
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    setPan({ x: e.clientX - dragOrigin.current.x, y: e.clientY - dragOrigin.current.y });
  }, []);
  const endDrag = useCallback(() => { isDragging.current = false; }, []);
  const resetView = useCallback(() => { setPan({ x: 0, y: 0 }); setScale(1); }, []);

  if (!nodes.length) return null;

  const transition = prefersReduced ? "none" : "opacity 120ms ease, transform 100ms ease";

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: 280,
        position: "relative",
        overflow: "hidden",
        background: "var(--skin-surface)",
        borderRadius: "var(--xr-lg)",
        border: "1px solid var(--skin-line)",
        cursor: isDragging.current ? "grabbing" : "grab",
        userSelect: "none",
      }}
      onWheel={onWheel}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={endDrag}
      onMouseLeave={endDrag}
      onDoubleClick={resetView}
    >
      <svg width={dims.w} height={dims.h} style={{ display: "block" }}>
        <g transform={`translate(${pan.x},${pan.y}) scale(${scale})`}>
          {/* Edges */}
          {edges.map((e, i) => {
            const s = byId.get(e.source);
            const t = byId.get(e.target);
            if (!s || !t) return null;
            const dimmed = connectedTo && !connectedTo.has(e.source) && !connectedTo.has(e.target);
            return (
              <line
                key={i}
                x1={s.x}
                y1={s.y}
                x2={t.x}
                y2={t.y}
                stroke="var(--skin-line)"
                strokeWidth={1}
                style={{ opacity: dimmed ? 0.15 : 1, transition }}
              />
            );
          })}

          {/* Nodes */}
          {layout.map((n) => {
            const r = radius(n);
            const isCenter = n.id === centerId;
            const isHovered = hovered === n.id;
            const dimmed = connectedTo && !connectedTo.has(n.id);
            const typeKey = n.kind === "note" && n.noteType ? n.noteType : n.kind;

            return (
              <g
                key={n.id}
                transform={`translate(${n.x},${n.y})`}
                style={{ cursor: isCenter ? "default" : "pointer", opacity: dimmed ? 0.25 : 1, transition }}
                onMouseEnter={() => setHovered(n.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={isCenter ? undefined : () => onOpenItem(n.id, n.kind)}
              >
                <circle
                  r={r}
                  fill={`var(--item-${typeKey})`}
                  stroke={isHovered ? "var(--skin-bg)" : "none"}
                  strokeWidth={isHovered ? 2.5 : 0}
                  style={{ transform: isHovered ? "scale(1.18)" : "scale(1)", transformOrigin: "0 0", transition }}
                />
                {isHovered && n.title && (
                  <>
                    <rect
                      x={-72}
                      y={-r - 26}
                      width={144}
                      height={20}
                      rx={4}
                      fill="var(--skin-ink)"
                      style={{ opacity: 0.92 }}
                    />
                    <text
                      y={-r - 12}
                      textAnchor="middle"
                      fill="var(--skin-bg)"
                      fontSize={11}
                      fontWeight={500}
                      style={{ pointerEvents: "none" }}
                    >
                      {n.title.length > 20 ? n.title.slice(0, 20) + "…" : n.title}
                    </text>
                  </>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      <button
        onClick={resetView}
        title="Reset view (or double-click)"
        style={{
          position: "absolute",
          bottom: 8,
          right: 8,
          fontSize: 11,
          color: "var(--skin-ink-faint)",
          background: "var(--skin-surface2)",
          border: "1px solid var(--skin-line)",
          borderRadius: 4,
          padding: "3px 8px",
          cursor: "pointer",
        }}
      >
        Reset
      </button>
    </div>
  );
}
