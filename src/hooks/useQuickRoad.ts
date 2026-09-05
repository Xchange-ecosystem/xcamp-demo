import { useCallback, useReducer } from "react";
import type { OutputNode, OutputTree } from "@/lib/backcaster-api";

export type QuickRoadStep = "input" | "interpret" | "generate";

export type StageStatus = "waiting" | "running" | "ok" | "failed" | "skipped";

export type WorkflowStage = "modes" | "session" | "interpret" | "generate" | "materialize";

export interface WorkflowDiag {
  stages: Record<WorkflowStage, StageStatus>;
  lastEndpoint: string | null;
  lastError: string | null;
}

const initialDiag: WorkflowDiag = {
  stages: {
    modes: "waiting",
    session: "waiting",
    interpret: "waiting",
    generate: "waiting",
    materialize: "waiting",
  },
  lastEndpoint: null,
  lastError: null,
};

export interface QuickRoadState {
  step: QuickRoadStep;
  sessionId: string | null;
  selectedModeId: string | null;
  rawInput: string;
  context: string;
  interpretation: string;
  outputTree: OutputTree | null;
  expandedNodeIds: Set<string>;
  projectTitleOverride: string;
  materializedProjectId: string | null;
  error: string | null;
  loading: boolean;
  diag: WorkflowDiag;
}

const initialState: QuickRoadState = {
  step: "input",
  sessionId: null,
  selectedModeId: null,
  rawInput: "",
  context: "",
  interpretation: "",
  outputTree: null,
  expandedNodeIds: new Set(),
  projectTitleOverride: "",
  materializedProjectId: null,
  error: null,
  loading: false,
  diag: initialDiag,
};

type Action =
  | { type: "patch"; payload: Partial<QuickRoadState> }
  | { type: "toggleNode"; id: string }
  | { type: "appendChild"; parentId: string; child: OutputNode }
  | { type: "removeNode"; id: string }
  | { type: "updateNode"; id: string; changes: { title?: string; description?: string } }
  | {
      type: "setStage";
      stage: WorkflowStage;
      status: StageStatus;
      endpoint?: string;
      error?: string | null;
    }
  | { type: "reset" };

function appendChildToTree(tree: OutputTree, parentId: string, child: OutputNode): OutputTree {
  const walk = (nodes: OutputNode[]): OutputNode[] =>
    nodes.map((n) => {
      if (n.id === parentId) {
        return { ...n, children: [...(n.children ?? []), child] };
      }
      return { ...n, children: walk(n.children ?? []) };
    });
  return { ...tree, root_nodes: walk(tree.root_nodes) };
}

function removeNodeFromTree(tree: OutputTree, id: string): OutputTree {
  const walk = (nodes: OutputNode[]): OutputNode[] =>
    nodes.filter((n) => n.id !== id).map((n) => ({ ...n, children: walk(n.children ?? []) }));
  return { ...tree, root_nodes: walk(tree.root_nodes) };
}

function updateNodeInTree(
  tree: OutputTree,
  id: string,
  changes: { title?: string; description?: string },
): OutputTree {
  const walk = (nodes: OutputNode[]): OutputNode[] =>
    nodes.map((n) =>
      n.id === id ? { ...n, ...changes } : { ...n, children: walk(n.children ?? []) },
    );
  return { ...tree, root_nodes: walk(tree.root_nodes) };
}

function reducer(state: QuickRoadState, action: Action): QuickRoadState {
  switch (action.type) {
    case "patch":
      return { ...state, ...action.payload };
    case "toggleNode": {
      const next = new Set(state.expandedNodeIds);
      if (next.has(action.id)) next.delete(action.id);
      else next.add(action.id);
      return { ...state, expandedNodeIds: next };
    }
    case "appendChild":
      if (!state.outputTree) return state;
      return {
        ...state,
        outputTree: appendChildToTree(state.outputTree, action.parentId, action.child),
      };
    case "removeNode":
      if (!state.outputTree) return state;
      return { ...state, outputTree: removeNodeFromTree(state.outputTree, action.id) };
    case "updateNode":
      if (!state.outputTree) return state;
      return {
        ...state,
        outputTree: updateNodeInTree(state.outputTree, action.id, action.changes),
      };
    case "setStage":
      return {
        ...state,
        diag: {
          stages: { ...state.diag.stages, [action.stage]: action.status },
          lastEndpoint: action.endpoint ?? state.diag.lastEndpoint,
          lastError: action.error === undefined ? state.diag.lastError : action.error,
        },
      };
    case "reset":
      return { ...initialState, diag: initialDiag, expandedNodeIds: new Set() };
    default:
      return state;
  }
}

export function useQuickRoad() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const patch = useCallback((payload: Partial<QuickRoadState>) => {
    dispatch({ type: "patch", payload });
  }, []);

  const toggleNode = useCallback((id: string) => dispatch({ type: "toggleNode", id }), []);
  const appendChild = useCallback(
    (parentId: string, child: OutputNode) => dispatch({ type: "appendChild", parentId, child }),
    [],
  );
  const removeNode = useCallback((id: string) => dispatch({ type: "removeNode", id }), []);
  const updateNode = useCallback(
    (id: string, changes: { title?: string; description?: string }) =>
      dispatch({ type: "updateNode", id, changes }),
    [],
  );
  const setStage = useCallback(
    (
      stage: WorkflowStage,
      status: StageStatus,
      opts?: { endpoint?: string; error?: string | null },
    ) => dispatch({ type: "setStage", stage, status, ...opts }),
    [],
  );
  const reset = useCallback(() => dispatch({ type: "reset" }), []);

  return { state, patch, toggleNode, appendChild, removeNode, updateNode, setStage, reset };
}
