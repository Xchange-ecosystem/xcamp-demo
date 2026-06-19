import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { useQuickRoad } from "@/hooks/useQuickRoad";
import type { StageStatus, WorkflowStage } from "@/hooks/useQuickRoad";

const STAGE_LABELS: { key: WorkflowStage; label: string }[] = [
  { key: "modes", label: "Mode loaded" },
  { key: "session", label: "Session created" },
  { key: "interpret", label: "Interpreted" },
  { key: "generate", label: "Tree generated" },
  { key: "materialize", label: "Project created" },
];

const STATUS_STYLE: Record<StageStatus, { dot: string; text: string; label: string }> = {
  waiting: { dot: "var(--skin-line)", text: "var(--skin-ink-soft)", label: "waiting" },
  running: { dot: "var(--skin-accent)", text: "var(--skin-accent)", label: "running…" },
  ok: { dot: "#16a34a", text: "var(--skin-ink)", label: "ok" },
  failed: { dot: "#dc2626", text: "#dc2626", label: "failed" },
  skipped: { dot: "var(--skin-line)", text: "var(--skin-ink-soft)", label: "skipped" },
};

function short(id: string | null): string {
  if (!id) return "—";
  return id.length > 12 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id;
}

export function WorkflowDiagnostics({ qr }: { qr: ReturnType<typeof useQuickRoad> }) {
  const { state } = qr;
  const { diag } = state;
  const [open, setOpen] = useState(true);

  return (
    <div
      className="mt-4 rounded-xl text-xs"
      style={{ background: "var(--skin-surface)", border: "1px solid var(--skin-line)" }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1.5 px-3 py-2 font-medium"
        style={{ color: "var(--skin-ink-soft)" }}
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        Workflow diagnostics
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-2">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {STAGE_LABELS.map((s) => {
              const st = STATUS_STYLE[diag.stages[s.key]];
              return (
                <span key={s.key} className="inline-flex items-center gap-1.5">
                  <span
                    className="inline-block rounded-full"
                    style={{ width: 8, height: 8, background: st.dot }}
                  />
                  <span style={{ color: "var(--skin-ink-soft)" }}>{s.label}:</span>
                  <span style={{ color: st.text }}>{st.label}</span>
                </span>
              );
            })}
          </div>

          <div
            className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 pt-1"
            style={{ color: "var(--skin-ink-soft)", borderTop: "1px solid var(--skin-line)" }}
          >
            <span>mode_id: <code>{short(state.selectedModeId)}</code></span>
            <span>session_id: <code>{short(state.sessionId)}</code></span>
            <span>project_id: <code>{short(state.materializedProjectId)}</code></span>
            <span>last endpoint: <code>{diag.lastEndpoint ?? "—"}</code></span>
          </div>

          {diag.lastError && (
            <p className="pt-1" style={{ color: "#dc2626" }}>
              last error: {diag.lastError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
