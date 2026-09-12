// src/components/demo/navigator/NavigatorNetworkView.tsx
//
// The Network sub-view — dark-canvas force-directed graph (color-by-type
// nodes, hover cards, legend filter, drag/zoom, click-to-inspect), per the
// prior session's Obsidian/Kumu-style spec. Phase 0 found no built network
// view matching that spec anywhere reachable (this repo's existing
// NavigatorGraph.tsx and the newly-merged Ecosystem Navigator's
// NetworkCanvas are both light-canvas, statically/radially laid out, not
// force-directed) — built fresh against demo fixtures, reusing
// NetworkCanvas (src/features/ecosystem-navigator/NetworkCanvas.tsx) as the
// rendering engine (extended with `draggable`/`variant="dark"` props) and a
// new self-contained force-layout pass (forceLayout.ts, no new dependency)
// instead of that component's radial layout.
import { useMemo, useState } from "react";
import { getProjectById } from "@/fixtures/projects";
import { DEMO_FOUNDER_PROJECT_ID } from "@/fixtures/pitch";
import { useSidepanel } from "@/contexts/sidepanel";
import {
  NetworkCanvas,
  type CanvasEdge,
  type CanvasNode,
  type CanvasNodeKind,
} from "@/features/ecosystem-navigator/NetworkCanvas";
import { computeForceLayout } from "./forceLayout";
import { getNavigatorItems, type NavigatorItem } from "./navigatorItems";

type LegendKind = Extract<CanvasNodeKind, "project" | "objective" | "task">;

const LEGEND: { kind: LegendKind; label: string; color: string }[] = [
  { kind: "project", label: "Project", color: "#8b5cf6" },
  { kind: "objective", label: "Objective", color: "#2dd4bf" },
  { kind: "task", label: "Task", color: "#f59e0b" },
];
const LEGEND_COLOR: Record<LegendKind, string> = Object.fromEntries(
  LEGEND.map((l) => [l.kind, l.color]),
) as Record<LegendKind, string>;

export function NavigatorNetworkView() {
  const { open: openSidepanel } = useSidepanel();
  const project = getProjectById(DEMO_FOUNDER_PROJECT_ID);
  const items = useMemo(() => getNavigatorItems(), []);
  const [visible, setVisible] = useState<Record<LegendKind, boolean>>({
    project: true,
    objective: true,
    task: true,
  });

  const projectNodeId = `project-${DEMO_FOUNDER_PROJECT_ID}`;

  const { layoutNodeIds, layoutEdges } = useMemo(() => {
    const ids: string[] = [projectNodeId];
    const edges: { source: string; target: string }[] = [];
    for (const item of items) {
      ids.push(item.id);
      if (item.type === "objective") {
        edges.push({ source: projectNodeId, target: item.id });
      } else if (item.objectiveId) {
        edges.push({ source: item.objectiveId, target: item.id });
      } else {
        edges.push({ source: projectNodeId, target: item.id });
      }
    }
    return { layoutNodeIds: ids, layoutEdges: edges };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const positions = useMemo(
    () =>
      computeForceLayout(
        layoutNodeIds.map((id) => ({ id })),
        layoutEdges,
      ),
    [layoutNodeIds, layoutEdges],
  );

  const nodes: CanvasNode[] = useMemo(() => {
    const result: CanvasNode[] = [];
    if (visible.project) {
      result.push({
        id: projectNodeId,
        kind: "project",
        label: project?.name ?? "Project",
        color: LEGEND_COLOR.project,
        position: positions[projectNodeId] ?? { x: 500, y: 380 },
      });
    }
    for (const item of items) {
      if (!visible[item.type as LegendKind]) continue;
      result.push({
        id: item.id,
        kind: item.type,
        label: item.title.length > 40 ? `${item.title.slice(0, 40)}…` : item.title,
        sublabel: item.status,
        color: LEGEND_COLOR[item.type as LegendKind],
        position: positions[item.id] ?? { x: 500, y: 380 },
        onClick: () =>
          openSidepanel(
            item.type === "objective"
              ? { id: item.id, kind: "objective", title: item.title }
              : { id: item.id, kind: "note", noteType: "task", title: item.title },
          ),
        tooltip: <NodeTooltip item={item} />,
      });
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, positions, visible, project]);

  const edges: CanvasEdge[] = useMemo(() => {
    const visibleIds = new Set(nodes.map((n) => n.id));
    return layoutEdges
      .filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target))
      .map((e) => ({ id: `${e.source}-${e.target}`, source: e.source, target: e.target }));
  }, [layoutEdges, nodes]);

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px 12px",
          flexShrink: 0,
        }}
      >
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Navigator</h1>
          <p className="text-sm text-muted-foreground">
            {project?.name ?? "This project"}'s objectives and tasks as a network.
          </p>
        </div>
      </div>

      <div style={{ position: "relative", display: "flex", flex: 1, minHeight: 0 }}>
        <NetworkCanvas nodes={nodes} edges={edges} draggable variant="dark" />

        {/* Legend + filter */}
        <div
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            zIndex: 10,
            background: "#161b22",
            border: "1px solid #2a3138",
            borderRadius: 10,
            padding: "10px 12px",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
          }}
        >
          <div style={{ fontSize: 10.5, fontWeight: 700, color: "#8b949e", marginBottom: 2 }}>
            LEGEND
          </div>
          {LEGEND.map((l) => (
            <label
              key={l.kind}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
                color: "#e6edf3",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={visible[l.kind]}
                onChange={(e) => setVisible((v) => ({ ...v, [l.kind]: e.target.checked }))}
              />
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  background: l.color,
                  flexShrink: 0,
                }}
              />
              {l.label}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

function NodeTooltip({ item }: { item: NavigatorItem }) {
  return (
    <div>
      <div style={{ fontWeight: 700, marginBottom: 3 }}>{item.title}</div>
      <div>
        {item.type === "objective" ? "Objective" : "Task"} · {item.status}
      </div>
      {item.ownerName && <div>Owner: {item.ownerName}</div>}
      {item.dueDate && <div>Due {item.dueDate}</div>}
    </div>
  );
}
