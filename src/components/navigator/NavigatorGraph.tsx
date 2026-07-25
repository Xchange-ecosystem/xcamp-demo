import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  addEdge,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  type Node,
  type Edge,
  type Connection,
  type NodeProps,
  type XYPosition,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { CheckCircle2, Circle, CirclePlus, LayoutGrid, Share2 } from "lucide-react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth";
import { useActiveProject } from "@/contexts/active-project";
import {
  useObjectives,
  listObjectiveTasks,
  createTaskNote,
  type ObjectiveRow,
  type NavTask,
} from "@/lib/navigator-api";
import { listProjects } from "@/lib/xcamp-api";
import { EntityPanel } from "@/components/EntityPanel";

/* ────────────────────────────────────────────────────────────────────
   Position persistence (localStorage, no migration required)
─────────────────────────────────────────────────────────────────── */

const STORAGE_KEY = (projectId: string) => `xcamp-nav-graph:${projectId}`;

function loadPositions(projectId: string): Record<string, XYPosition> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY(projectId)) ?? "{}") as Record<
      string,
      XYPosition
    >;
  } catch {
    return {};
  }
}

function savePositions(projectId: string, positions: Record<string, XYPosition>) {
  localStorage.setItem(STORAGE_KEY(projectId), JSON.stringify(positions));
}

/* ────────────────────────────────────────────────────────────────────
   Layout constants
─────────────────────────────────────────────────────────────────── */

const CX = 500;
const CY = 350;
const OBJ_RADIUS = 230;
const TASK_RADIUS = 390;
const MAX_TASKS_PER_OBJ = 6;

function radialPos(i: number, total: number, cx: number, cy: number, r: number): XYPosition {
  if (total === 0) return { x: cx, y: cy };
  const angle = (2 * Math.PI * i) / total - Math.PI / 2;
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

/* ────────────────────────────────────────────────────────────────────
   Build nodes + edges from data
─────────────────────────────────────────────────────────────────── */

interface OpenNodeFn {
  (id: string, type: "objective" | "task" | "note"): void;
}
interface AddTaskFn {
  (objectiveId: string): void;
}

function buildLayout(
  projectId: string,
  projectLabel: string,
  objectives: ObjectiveRow[],
  tasksByObjective: Map<string, NavTask[]>,
  onOpenNode: OpenNodeFn,
  onAddTask: AddTaskFn,
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const projNodeId = `proj-${projectId}`;
  nodes.push({
    id: projNodeId,
    type: "project-node",
    data: { label: projectLabel },
    position: { x: CX, y: CY },
    draggable: true,
  });

  objectives.forEach((obj, i) => {
    const objPos = radialPos(i, objectives.length, CX, CY, OBJ_RADIUS);
    const objNodeId = `obj-${obj.id}`;

    nodes.push({
      id: objNodeId,
      type: "objective-node",
      data: {
        obj,
        onOpen: (id: string) => onOpenNode(id, "objective"),
        onAdd: onAddTask,
      },
      position: objPos,
      draggable: true,
    });

    edges.push({
      id: `e-proj-${obj.id}`,
      source: projNodeId,
      target: objNodeId,
      style: { stroke: "var(--skin-line)", strokeWidth: 1.5 },
    });

    const tasks = (tasksByObjective.get(obj.id) ?? []).slice(0, MAX_TASKS_PER_OBJ);
    const objAngle = (2 * Math.PI * i) / objectives.length - Math.PI / 2;

    tasks.forEach((task, j) => {
      const spread = Math.min(0.55, 0.9 / Math.max(tasks.length, 1));
      const taskAngle = objAngle + spread * (j - (tasks.length - 1) / 2);
      const taskPos: XYPosition = {
        x: CX + TASK_RADIUS * Math.cos(taskAngle),
        y: CY + TASK_RADIUS * Math.sin(taskAngle),
      };
      const taskNodeId = `task-${task.id}`;

      nodes.push({
        id: taskNodeId,
        type: "task-node",
        data: {
          task,
          onOpen: (id: string, type: "task" | "note") => onOpenNode(id, type),
        },
        position: taskPos,
        draggable: true,
      });

      edges.push({
        id: `e-${objNodeId}-${taskNodeId}`,
        source: objNodeId,
        target: taskNodeId,
        style: {
          stroke: "var(--skin-line)",
          strokeWidth: 1,
          strokeDasharray: "4 3",
        },
      });
    });
  });

  return { nodes, edges };
}

/* ────────────────────────────────────────────────────────────────────
   Custom node components (defined OUTSIDE the main component so
   nodeTypes object reference stays stable across renders)
─────────────────────────────────────────────────────────────────── */

function statusColor(status: string | null): string {
  switch (status) {
    case "active":
      return "var(--skin-accent)";
    case "completed":
      return "#22c55e";
    case "inactive":
      return "var(--skin-ink-faint)";
    default:
      return "var(--skin-accent)";
  }
}

function ProjectNode({ data }: NodeProps) {
  const label = data.label as string;
  return (
    <div
      style={{
        width: 80,
        height: 80,
        borderRadius: "50%",
        background: "var(--skin-accent)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 11,
        fontWeight: 700,
        color: "#fff",
        textAlign: "center",
        padding: 8,
        boxShadow: "0 2px 12px rgba(0,0,0,0.18)",
        boxSizing: "border-box",
      }}
    >
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ opacity: 0, pointerEvents: "none" }}
      />
      <span style={{ lineHeight: 1.2, wordBreak: "break-word" }}>{label}</span>
    </div>
  );
}

function ObjectiveNode({ data }: NodeProps) {
  const { obj, onOpen, onAdd } = data as {
    obj: ObjectiveRow;
    onOpen: (id: string) => void;
    onAdd: (id: string) => void;
  };
  const color = statusColor(obj.status);
  const progress =
    obj.tasksCount > 0
      ? Math.round((obj.completedTasksCount / obj.tasksCount) * 100)
      : null;

  return (
    <div
      onClick={() => onOpen(obj.id)}
      style={{
        width: 120,
        height: 120,
        borderRadius: "50%",
        background: "var(--skin-surface)",
        border: `2.5px solid ${color}`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        position: "relative",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        boxSizing: "border-box",
        transition: "box-shadow 0.15s",
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ opacity: 0, pointerEvents: "none" }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ opacity: 0, pointerEvents: "none" }}
      />

      {/* + button */}
      <button
        className="nodrag nopan"
        onClick={(e) => {
          e.stopPropagation();
          onAdd(obj.id);
        }}
        title="Add task"
        style={{
          position: "absolute",
          top: 6,
          right: 6,
          width: 20,
          height: 20,
          borderRadius: "50%",
          border: `1px solid ${color}`,
          background: "var(--skin-surface)",
          color: color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          padding: 0,
          lineHeight: 1,
        }}
      >
        <CirclePlus size={14} />
      </button>

      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: "var(--skin-ink)",
          textAlign: "center",
          padding: "0 14px",
          lineHeight: 1.25,
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical",
          wordBreak: "break-word",
        }}
      >
        {obj.title.length > 50 ? obj.title.slice(0, 50) + "…" : obj.title}
      </span>

      {progress !== null && (
        <span style={{ fontSize: 9, color, marginTop: 3, fontWeight: 500 }}>
          {obj.completedTasksCount}/{obj.tasksCount} · {progress}%
        </span>
      )}
    </div>
  );
}

function TaskNode({ data }: NodeProps) {
  const { task, onOpen } = data as {
    task: NavTask;
    onOpen: (id: string, type: "task" | "note") => void;
  };
  const isNote = task.note_type === "note";

  return (
    <div
      onClick={() => onOpen(task.id, isNote ? "note" : "task")}
      style={{
        minWidth: 100,
        maxWidth: 140,
        padding: "6px 10px",
        borderRadius: 8,
        background: "var(--skin-surface)",
        border: `1px solid ${task.done ? "#22c55e" : "var(--skin-line)"}`,
        display: "flex",
        alignItems: "flex-start",
        gap: 5,
        cursor: "pointer",
        boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
        opacity: task.done ? 0.65 : 1,
        boxSizing: "border-box",
        transition: "box-shadow 0.15s",
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ opacity: 0, pointerEvents: "none" }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ opacity: 0, pointerEvents: "none" }}
      />

      {task.done ? (
        <CheckCircle2 size={11} style={{ color: "#22c55e", flexShrink: 0, marginTop: 1 }} />
      ) : (
        <Circle size={11} style={{ color: "var(--skin-ink-faint)", flexShrink: 0, marginTop: 1 }} />
      )}
      <span
        style={{
          fontSize: 11,
          color: "var(--skin-ink)",
          lineHeight: 1.3,
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          wordBreak: "break-word",
        }}
      >
        {task.title ?? "(untitled)"}
      </span>
    </div>
  );
}

const nodeTypes = {
  "project-node": ProjectNode,
  "objective-node": ObjectiveNode,
  "task-node": TaskNode,
};

/* ────────────────────────────────────────────────────────────────────
   Main NavigatorGraph component
─────────────────────────────────────────────────────────────────── */

type PanelState = {
  open: boolean;
  type: "objective" | "task" | "note";
  id: string;
  objectiveId?: string;
};

export function NavigatorGraph() {
  const { user } = useAuth();
  const { activeProjectId } = useActiveProject();

  const { data: projects = [] } = useQuery({
    queryKey: ["projects", user?.tenantId],
    queryFn: () => listProjects(user!),
    enabled: !!user,
  });

  const projectName = useMemo(() => {
    return projects.find((p) => p.id === activeProjectId)?.name ?? "Project";
  }, [projects, activeProjectId]);

  const { data: allObjectives = [], isLoading } = useObjectives(user, activeProjectId);
  const objectives = useMemo(
    () => allObjectives.filter((o) => o.title !== "__general__"),
    [allObjectives],
  );

  // Fetch tasks for every objective in parallel
  const taskQueries = useQueries({
    queries: objectives.map((obj) => ({
      queryKey: ["nav-tasks", "objective", obj.id],
      queryFn: () => listObjectiveTasks(obj.id),
      enabled: !!obj.id,
    })),
  });

  const tasksByObjective = useMemo(() => {
    const map = new Map<string, NavTask[]>();
    objectives.forEach((obj, i) => {
      map.set(obj.id, taskQueries[i]?.data ?? []);
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objectives, taskQueries]);

  /* Entity panel ─────────────────────────────────────────────────── */

  const [panel, setPanel] = useState<PanelState>({ open: false, type: "task", id: "" });

  const closePanel = useCallback(() => setPanel((s) => ({ ...s, open: false })), []);

  const onOpenNode = useCallback<OpenNodeFn>((id, type) => {
    setPanel({ open: true, type, id });
  }, []);

  const onAddTask = useCallback<AddTaskFn>(
    async (objectiveId: string) => {
      if (!user || !activeProjectId) return;
      try {
        const note = await createTaskNote(user, activeProjectId, {
          title: "",
          objectiveId,
        });
        setPanel({ open: true, type: "task", id: note.id, objectiveId });
      } catch {
        toast.error("Failed to create task");
      }
    },
    [user, activeProjectId],
  );

  /* React Flow state ─────────────────────────────────────────────── */

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Keep a ref so onNodeDragStop can read current positions without stale closure
  const nodesRef = useRef<Node[]>([]);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  // Rebuild graph whenever objectives or tasks update
  useEffect(() => {
    if (!activeProjectId || isLoading) return;
    const { nodes: newNodes, edges: newEdges } = buildLayout(
      activeProjectId,
      projectName,
      objectives,
      tasksByObjective,
      onOpenNode,
      onAddTask,
    );
    const savedPos = loadPositions(activeProjectId);
    const merged = newNodes.map((n) => ({
      ...n,
      position: savedPos[n.id] ?? n.position,
    }));
    setNodes(merged);
    setEdges(newEdges);
  }, [
    activeProjectId,
    projectName,
    objectives,
    tasksByObjective,
    isLoading,
    onOpenNode,
    onAddTask,
    setNodes,
    setEdges,
  ]);

  /* Handlers ──────────────────────────────────────────────────────── */

  const onNodeDragStop = useCallback(() => {
    if (!activeProjectId) return;
    const positions: Record<string, XYPosition> = {};
    nodesRef.current.forEach((n) => {
      positions[n.id] = n.position;
    });
    savePositions(activeProjectId, positions);
  }, [activeProjectId]);

  const onConnect = useCallback(
    (connection: Connection) => {
      const srcIsObj = connection.source?.startsWith("obj-");
      const tgtIsObj = connection.target?.startsWith("obj-");
      if (srcIsObj && tgtIsObj) {
        toast("Cross-objective links need a DB migration", {
          description:
            "Linking objectives to each other requires an objective_links table. This is planned for a future release.",
        });
        return;
      }
      setEdges((eds) => addEdge(connection, eds));
    },
    [setEdges],
  );

  const handleAutoArrange = useCallback(() => {
    if (!activeProjectId) return;
    const { nodes: newNodes, edges: newEdges } = buildLayout(
      activeProjectId,
      projectName,
      objectives,
      tasksByObjective,
      onOpenNode,
      onAddTask,
    );
    setNodes(newNodes);
    setEdges(newEdges);
    localStorage.removeItem(STORAGE_KEY(activeProjectId));
  }, [
    activeProjectId,
    projectName,
    objectives,
    tasksByObjective,
    onOpenNode,
    onAddTask,
    setNodes,
    setEdges,
  ]);

  /* Empty states ──────────────────────────────────────────────────── */

  if (!activeProjectId) {
    return (
      <EmptyState>
        <p style={{ fontSize: 15, color: "var(--skin-ink-soft)", marginBottom: 6 }}>
          No project selected.
        </p>
        <p style={{ fontSize: 13, color: "var(--skin-ink-faint)" }}>
          Pick a project from the sidebar to view the network.
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
            width: 48,
            height: 48,
            borderRadius: 14,
            background: "var(--skin-accent-faint, rgba(78,193,211,0.1))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 12px",
          }}
        >
          <Share2 size={22} style={{ color: "var(--skin-accent)" }} />
        </div>
        <p style={{ fontSize: 15, color: "var(--skin-ink-soft)", marginBottom: 4 }}>
          No objectives yet
        </p>
        <p style={{ fontSize: 13, color: "var(--skin-ink-faint)" }}>
          Add objectives in the Browser view to see them here.
        </p>
      </EmptyState>
    );
  }

  return (
    <>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDragStop={onNodeDragStop}
          nodeOrigin={[0.5, 0.5]}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.15}
          maxZoom={2.5}
          style={{ background: "var(--skin-bg)" }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="var(--skin-line)"
          />
          <Controls />
          <MiniMap
            nodeColor={(n) => {
              if (n.type === "project-node") return "var(--skin-accent)";
              if (n.type === "objective-node") {
                const obj = (n.data as { obj: ObjectiveRow }).obj;
                return statusColor(obj.status);
              }
              return "var(--skin-line)";
            }}
            maskColor="rgba(0,0,0,0.05)"
            style={{ background: "var(--skin-surface)" }}
          />
          <Panel position="top-right">
            <button
              onClick={handleAutoArrange}
              title="Reset to radial layout"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "5px 10px",
                borderRadius: 7,
                border: "1px solid var(--skin-line)",
                background: "var(--skin-surface)",
                color: "var(--skin-ink-soft)",
                fontSize: 12,
                cursor: "pointer",
                boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
              }}
            >
              <LayoutGrid size={13} />
              Arrange
            </button>
          </Panel>
        </ReactFlow>
      </div>

      <EntityPanel
        open={panel.open}
        onClose={closePanel}
        type={panel.type}
        id={panel.id}
        objectiveId={panel.objectiveId}
        user={user ?? undefined}
      />
    </>
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
