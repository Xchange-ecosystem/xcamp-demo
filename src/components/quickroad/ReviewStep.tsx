import { useState } from "react";
import { Loader2, ExternalLink, AlertCircle } from "lucide-react";
import { materialize, getSession, BackcasterError, DEEP_LINK_BASE, type OutputNode } from "@/lib/backcaster-api";
import type { useQuickRoad } from "@/hooks/useQuickRoad";

function countByType(nodes: OutputNode[], type: string): number {
  return nodes.reduce(
    (acc, n) => acc + (n.node_type === type ? 1 : 0) + countByType(n.children ?? [], type),
    0,
  );
}

export function ReviewStep({ qr }: { qr: ReturnType<typeof useQuickRoad> }) {
  const { state, patch } = qr;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyCreated, setAlreadyCreated] = useState(false);

  const nodes = state.outputTree?.root_nodes ?? [];
  const objectiveCount = countByType(nodes, "objective") || nodes.length;
  const noteCount = countByType(nodes, "note");

  const create = async () => {
    if (!state.sessionId) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await materialize(state.sessionId, {
        title_override: state.projectTitleOverride || undefined,
      });
      patch({ materializedProjectId: result.project_id, step: "review" });
    } catch (e) {
      if (e instanceof BackcasterError && e.status === 409) {
        setAlreadyCreated(true);
        // Re-fetch session to recover the deep link.
        try {
          const session = await getSession(state.sessionId);
          if (session.materialized_init_id) {
            patch({ materializedProjectId: session.materialized_init_id });
          }
        } catch {
          // ignore
        }
      } else {
        setError((e as Error).message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (alreadyCreated) {
    return (
      <div className="text-center py-12 space-y-4">
        <AlertCircle className="mx-auto" size={28} style={{ color: "var(--accent-yellow, #E6A817)" }} />
        <p style={{ color: "var(--skin-ink)" }}>This project was already created.</p>
        {state.materializedProjectId && (
          <a
            href={`${DEEP_LINK_BASE}/${state.materializedProjectId}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold"
            style={{ background: "var(--skin-accent)", color: "#fff" }}
          >
            Open in Xcamp <ExternalLink size={16} />
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: "var(--skin-ink)" }}>
          Almost there
        </h2>
        <p className="text-sm" style={{ color: "var(--skin-ink-soft)" }}>
          Give your project a name and create it.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: "var(--skin-ink-soft)" }}>
          Project title
        </label>
        <input
          value={state.projectTitleOverride}
          onChange={(e) => patch({ projectTitleOverride: e.target.value })}
          className="w-full rounded-xl p-3 text-sm outline-none"
          style={{ background: "var(--skin-bg)", border: "1px solid var(--skin-line)", color: "var(--skin-ink)" }}
        />
      </div>

      <div className="flex gap-4">
        <div className="flex-1 rounded-xl p-4 text-center" style={{ background: "var(--skin-bg)", border: "1px solid var(--skin-line)" }}>
          <div className="text-2xl font-semibold" style={{ color: "var(--skin-ink)" }}>{objectiveCount}</div>
          <div className="text-xs uppercase tracking-wide" style={{ color: "var(--skin-ink-soft)" }}>Objectives</div>
        </div>
        <div className="flex-1 rounded-xl p-4 text-center" style={{ background: "var(--skin-bg)", border: "1px solid var(--skin-line)" }}>
          <div className="text-2xl font-semibold" style={{ color: "var(--skin-ink)" }}>{noteCount}</div>
          <div className="text-xs uppercase tracking-wide" style={{ color: "var(--skin-ink-soft)" }}>Notes</div>
        </div>
      </div>

      {error && (
        <p className="text-sm" style={{ color: "var(--accent-yellow, #E6A817)" }}>
          {error}
        </p>
      )}

      <div
        className="rounded-xl p-4"
        style={{ background: "rgba(230,168,23,0.12)", border: "1px solid var(--accent-yellow, #E6A817)" }}
      >
        <p className="text-sm mb-3" style={{ color: "var(--skin-ink)" }}>
          This creates your project — you can edit it in Xcamp afterwards.
        </p>
        <button
          type="button"
          disabled={submitting}
          onClick={create}
          className="w-full rounded-xl py-3 font-semibold inline-flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
          style={{ background: "var(--accent-yellow, #E6A817)", color: "#1a1300" }}
        >
          {submitting && <Loader2 className="animate-spin" size={16} />}
          Create in Xcamp
        </button>
      </div>

      <button
        type="button"
        onClick={() => patch({ step: "generate" })}
        className="w-full rounded-xl py-2.5 text-sm font-medium"
        style={{ background: "var(--skin-surface)", color: "var(--skin-ink-soft)", border: "1px solid var(--skin-line)" }}
      >
        Save for later
      </button>
    </div>
  );
}
