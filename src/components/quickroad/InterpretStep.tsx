import { useState } from "react";
import { Loader2 } from "lucide-react";
import { interpret } from "@/lib/backcaster-api";
import type { useQuickRoad } from "@/hooks/useQuickRoad";

export function InterpretStep({ qr }: { qr: ReturnType<typeof useQuickRoad> }) {
  const { state, patch } = qr;
  const [reinterpreting, setReinterpreting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reinterpret = async () => {
    if (!state.sessionId) return;
    setReinterpreting(true);
    setError(null);
    try {
      const result = await interpret({
        session_id: state.sessionId,
        raw_input: state.rawInput,
        context: state.context || undefined,
      });
      patch({ interpretation: result.interpretation });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setReinterpreting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: "var(--skin-ink)" }}>
          Here's what I understood
        </h2>
        <p className="text-sm" style={{ color: "var(--skin-ink-soft)" }}>
          Edit if needed, then continue.
        </p>
      </div>

      <textarea
        value={state.interpretation ?? ""}
        onChange={(e) => patch({ interpretation: e.target.value })}
        rows={8}
        className="w-full rounded-xl p-3 text-sm outline-none resize-y leading-relaxed"
        style={{ background: "var(--skin-bg)", border: "1px solid var(--skin-line)", color: "var(--skin-ink)" }}
      />

      {error && (
        <p className="text-sm" style={{ color: "var(--accent-yellow, #E6A817)" }}>
          {error}
        </p>
      )}

      {!state.sessionId && (
        <p className="text-sm" style={{ color: "#dc2626" }}>
          No session id is set — the plan step cannot run. Go back and start again.
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          disabled={reinterpreting || !state.sessionId}
          onClick={reinterpret}
          className="rounded-xl py-3 px-5 font-medium inline-flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
          style={{ background: "var(--skin-surface)", color: "var(--skin-ink)", border: "1px solid var(--skin-line)" }}
        >
          {reinterpreting && <Loader2 className="animate-spin" size={16} />}
          Re-interpret
        </button>
        <button
          type="button"
          disabled={!(state.interpretation ?? "").trim() || !state.sessionId}
          onClick={() => patch({ step: "generate" })}
          className="flex-1 rounded-xl py-3 font-semibold transition-opacity disabled:opacity-50"
          style={{ background: "var(--skin-accent)", color: "#fff" }}
        >
          Create plan
        </button>
      </div>
    </div>
  );
}
