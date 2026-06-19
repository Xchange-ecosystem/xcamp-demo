import { useEffect, useState, useRef } from "react";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { generate, fillNode, materialize, getSession, BackcasterError } from "@/lib/backcaster-api";
import type { useQuickRoad } from "@/hooks/useQuickRoad";
import { NodeCard } from "./NodeCard";

export function GenerateStep({ qr }: { qr: ReturnType<typeof useQuickRoad> }) {
  const { state, patch, toggleNode, appendChild } = qr;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fillingId, setFillingId] = useState<string | null>(null);
  const started = useRef(false);

  const runGenerate = async () => {
    if (!state.sessionId || !state.selectedModeId) return;
    setLoading(true);
    setError(null);
    try {
      const tree = await generate({
        session_id: state.sessionId,
        interpretation: state.interpretation,
        mode_id: state.selectedModeId,
        expand_leaves: false,
      });
      patch({ outputTree: tree, projectTitleOverride: state.projectTitleOverride || tree.title });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!started.current && !state.outputTree) {
      started.current = true;
      runGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFill = async (parentId: string) => {
    if (!state.sessionId) return;
    setFillingId(parentId);
    try {
      const child = await fillNode({
        session_id: state.sessionId,
        parent_node_id: parentId,
        context: state.context || undefined,
      });
      appendChild(parentId, child);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setFillingId(null);
    }
  };

  const regenerate = () => {
    if (window.confirm("Regenerate? This replaces the current plan with a fresh one.")) {
      patch({ outputTree: null });
      runGenerate();
    }
  };

  if (loading && !state.outputTree) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16" style={{ color: "var(--skin-ink-soft)" }}>
        <Loader2 className="animate-spin" size={28} style={{ color: "var(--skin-accent)" }} />
        <p>Shaping your plan…</p>
      </div>
    );
  }

  if (error && !state.outputTree) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="mx-auto mb-3" size={28} style={{ color: "var(--skin-ink-soft)" }} />
        <p style={{ color: "var(--skin-ink)" }}>{error}</p>
        <button onClick={runGenerate} className="mt-4 rounded-lg px-4 py-2 text-sm font-medium" style={{ background: "var(--skin-accent)", color: "#fff" }}>
          Try again
        </button>
      </div>
    );
  }

  if (!state.outputTree) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: "var(--skin-ink)" }}>
            {state.outputTree.title}
          </h2>
          {state.outputTree.summary && (
            <p className="text-sm mt-0.5" style={{ color: "var(--skin-ink-soft)" }}>
              {state.outputTree.summary}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={regenerate}
          title="Regenerate"
          className="shrink-0 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm"
          style={{ color: "var(--skin-ink-soft)", border: "1px solid var(--skin-line)" }}
        >
          <RefreshCw size={14} /> <span className="hidden sm:inline">Regenerate</span>
        </button>
      </div>

      {error && (
        <p className="text-sm" style={{ color: "var(--accent-yellow, #E6A817)" }}>
          {error}
        </p>
      )}

      <div className="space-y-3">
        {state.outputTree.root_nodes.map((node) => (
          <NodeCard
            key={node.id}
            node={node}
            expanded={state.expandedNodeIds.has(node.id)}
            onToggle={() => toggleNode(node.id)}
            onFill={() => handleFill(node.id)}
            filling={fillingId === node.id}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => patch({ step: "review" })}
        className="w-full rounded-xl py-3 font-semibold"
        style={{ background: "var(--skin-accent)", color: "#fff" }}
      >
        Review & create
      </button>
    </div>
  );
}
