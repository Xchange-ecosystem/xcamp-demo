import { useCallback, useReducer } from "react";
import type { OutputNode, OutputTree } from "@/lib/backcaster-api";

export type QuickRoadStep = "input" | "interpret" | "generate";

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
};

type Action =
  | { type: "patch"; payload: Partial<QuickRoadState> }
  | { type: "toggleNode"; id: string }
  | { type: "appendChild"; parentId: string; child: OutputNode }
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
    case "reset":
      return { ...initialState, expandedNodeIds: new Set() };
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
  const reset = useCallback(() => dispatch({ type: "reset" }), []);

  return { state, patch, toggleNode, appendChild, reset };
}
