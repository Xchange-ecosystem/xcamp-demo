import { useEffect, useState, useRef } from "react";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { generate, fillNode, materialize, getSession, BackcasterError } from "@/lib/backcaster-api";
import type { useQuickRoad } from "@/hooks/useQuickRoad";
import { NodeCard } from "./NodeCard";
import { NetworkBuildAnimation } from "./NetworkBuildAnimation";
import { useHeroImage } from "@/lib/useHeroImage";

export function GenerateStep({ qr }: { qr: ReturnType<typeof useQuickRoad> }) {
  const { state, patch, toggleNode, appendChild, removeNode, updateNode, setStage } = qr;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fillingId, setFillingId] = useState<string | null>(null);
  const [fillError, setFillError] = useState<string | null>(null);
  const [building, setBuilding] = useState(false);
  const started = useRef(false);

  // Hero image stub (CR-022b) — no image generation endpoint exists in this backend yet.
  // UI is complete and wired to useHeroImage for a real photo from storage.
  // When a generate-image endpoint becomes available, replace useHeroImage with the real call.
  const heroSeed = state.projectTitleOverride || state.outputTree?.title || "project";
  const { url: heroUrl, reload: reloadHero } = useHeroImage(heroSeed);

  // Hard guard: never silently render an empty container.
  const missing = !state.sessionId
    ? "session id"
    : !state.selectedModeId
      ? "mode id"
      : !(state.interpretation ?? "").trim()
        ? "interpreted input"
        : null;

  const buildProject = async () => {
    if (!state.sessionId) return;
    setBuilding(true);
    setError(null);
    setStage("materialize", "running", {
      endpoint: `POST /sessions/${state.sessionId}/materialize`,
      error: null,
    });
    try {
      const result = await materialize(state.sessionId, {
        title_override: state.projectTitleOverride || state.outputTree?.title || undefined,
      });
      patch({ materializedProjectId: result.project_id });
      setStage("materialize", "ok");
    } catch (e) {
      if (e instanceof BackcasterError && e.status === 409) {
        try {
          const session = await getSession(state.sessionId);
          if (session.materialized_init_id) {
            patch({ materializedProjectId: session.materialized_init_id });
            setStage("materialize", "ok");
            return;
          }
        } catch {
          // ignore
        }
        setError("This project was already created.");
        setStage("materialize", "failed", { error: "Already created (409)." });
      } else {
        const msg = (e as Error).message;
        setError(msg);
        setStage("materialize", "failed", { error: msg });
      }
    } finally {
      setBuilding(false);
    }
  };

  const runGenerate = async () => {
    const interpretedInput = (state.interpretation ?? "").trim();
    if (!state.sessionId || !state.selectedModeId || !interpretedInput) {
      const what = !state.sessionId
        ? "session id"
        : !state.selectedModeId
          ? "mode id"
          : "interpreted input";
      const msg = `Cannot generate: missing ${what}.`;
      setError(msg);
      setStage("generate", "failed", { error: msg });
      if (what === "interpreted input") patch({ step: "interpret" });
      return;
    }
    setLoading(true);
    setError(null);
    setStage("generate", "running", { endpoint: "POST /generate", error: null });
    try {
      const tree = await generate({
        session_id: state.sessionId,
        interpretation: state.interpretation,
        mode_id: state.selectedModeId,
        expand_leaves: false,
      });
      patch({ outputTree: tree, projectTitleOverride: state.projectTitleOverride || tree.title });
      setStage("generate", "ok");
    } catch (e) {
      const msg = (e as Error).message;
      setError(msg);
      setStage("generate", "failed", { error: msg });
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
    if (!state.sessionId || !state.outputTree) return;
    setFillingId(parentId);
    setFillError(null);
    try {
      const child = await fillNode({
        session_id: state.sessionId,
        interpreted_input: state.interpretation,
        output_tree: state.outputTree,
        parent_node_id: parentId,
        context: state.context || undefined,
      });
      appendChild(parentId, child);
    } catch {
      setFillError("Couldn't add this step. Please try again.");
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

  if (missing) {
    return (
      <div className="text-center py-8">
        <div
          className="mx-auto mb-4 max-w-md rounded-lg p-3 text-sm flex items-center justify-center gap-2"
          style={{
            background: "color-mix(in oklab, #dc2626 12%, transparent)",
            color: "var(--skin-ink)",
          }}
        >
          <AlertCircle size={16} style={{ color: "#dc2626" }} />
          Cannot build the plan: {missing} is missing. Please go back and start again.
        </div>
        <button
          onClick={() => patch({ step: "input" })}
          className="rounded-lg px-4 py-2 text-sm font-medium"
          style={{ background: "var(--skin-accent)", color: "#fff" }}
        >
          Back to start
        </button>
      </div>
    );
  }

  if (loading && !state.outputTree) {
    return (
      <div>
        <NetworkBuildAnimation caption="Shaping your plan…" />
        {error && (
          <div
            className="mx-auto mt-2 max-w-md rounded-lg p-3 text-center text-sm flex items-center justify-center gap-2"
            style={{
              background: "color-mix(in oklab, var(--accent-yellow, #E6A817) 12%, transparent)",
              color: "var(--skin-ink)",
            }}
          >
            <AlertCircle size={16} style={{ color: "var(--accent-yellow, #E6A817)" }} />
            {error}
          </div>
        )}
      </div>
    );
  }

  if (error && !state.outputTree) {
    return (
      <div>
        <NetworkBuildAnimation caption="Something interrupted the plan." />
        <div className="text-center pb-6">
          <div
            className="mx-auto mb-4 max-w-md rounded-lg p-3 text-sm flex items-center justify-center gap-2"
            style={{
              background: "color-mix(in oklab, var(--accent-yellow, #E6A817) 12%, transparent)",
              color: "var(--skin-ink)",
            }}
          >
            <AlertCircle size={16} style={{ color: "var(--accent-yellow, #E6A817)" }} />
            {error}
          </div>
          <button
            onClick={runGenerate}
            className="rounded-lg px-4 py-2 text-sm font-medium"
            style={{ background: "var(--skin-accent)", color: "#fff" }}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!state.outputTree) return null;

  return (
    <div className="space-y-4">
      {/* Hero image preview — CR-022b
          No image generation endpoint exists in xcampapi yet (SCENARIO B).
          useHeroImage picks a real photo from the "App media/Hero" storage bucket
          as a preview. The ↻ button cycles through stored images.
          TODO: replace reloadHero with a real generate-image call once the endpoint ships. */}
      {heroUrl && (
        <div className="relative rounded-xl overflow-hidden" style={{ height: 120 }}>
          <img
            src={heroUrl}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div
            aria-hidden
            className="absolute inset-0"
            style={{ background: "var(--skin-accent)", mixBlendMode: "multiply", opacity: 0.5 }}
          />
          <button
            type="button"
            onClick={reloadHero}
            aria-label="Regenerate image"
            className="absolute top-2 right-2 inline-flex items-center gap-1.5 rounded-full bg-black/30 backdrop-blur-sm px-3 py-1.5 text-xs font-medium text-white/90 hover:bg-black/50 transition-colors"
          >
            <RefreshCw size={12} /> Regenerate image
          </button>
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* CR-022a — editable project title */}
          <input
            className="w-full bg-transparent text-lg font-semibold outline-none rounded px-1 -mx-1"
            style={{
              color: "var(--skin-ink)",
              border: "1px solid transparent",
            }}
            value={state.projectTitleOverride || state.outputTree.title}
            onChange={(e) => patch({ projectTitleOverride: e.target.value })}
            onFocus={(e) => {
              (e.currentTarget as HTMLInputElement).style.border = "1px solid var(--skin-line)";
            }}
            onBlur={(e) => {
              (e.currentTarget as HTMLInputElement).style.border = "1px solid transparent";
            }}
            aria-label="Project title"
            placeholder="Project title"
          />
          {state.outputTree.summary && (
            <p className="text-sm mt-0.5" style={{ color: "var(--skin-ink-soft)" }}>
              {state.outputTree.summary}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={regenerate}
          title="Regenerate plan"
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

      {fillError && (
        <p className="text-sm" style={{ color: "var(--accent-yellow, #E6A817)" }}>
          {fillError}
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
            onRemove={() => removeNode(node.id)}
            onUpdate={(changes) => updateNode(node.id, changes)}
          />
        ))}
      </div>

      <button
        type="button"
        disabled={building}
        onClick={buildProject}
        className="w-full rounded-xl py-3 font-semibold inline-flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
        style={{ background: "var(--skin-accent)", color: "#fff" }}
      >
        {building && <Loader2 className="animate-spin" size={16} />}
        Build project
      </button>
    </div>
  );
}
