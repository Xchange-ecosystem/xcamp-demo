import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { createSession, interpret, listModes } from "@/lib/backcaster-api";
import type { useQuickRoad } from "@/hooks/useQuickRoad";

export function InputStep({ qr }: { qr: ReturnType<typeof useQuickRoad> }) {
  const { state, patch } = qr;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Silently fetch modes and auto-pick the gentlest active one.
  useEffect(() => {
    if (state.selectedModeId) return;
    listModes()
      .then((all) => {
        const active = all.filter((m) => m.is_active);
        if (!active.length) return;
        const lowest = [...active].sort((a, b) => a.default_depth - b.default_depth)[0];
        patch({ selectedModeId: lowest.id });
      })
      .catch((e) => setError((e as Error).message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async () => {
    if (!state.rawInput.trim()) return;
    if (!state.selectedModeId) {
      setError("Still getting ready — please try again in a moment.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const session = await createSession({
        mode_id: state.selectedModeId,
        raw_input: state.rawInput,
      });
      const result = await interpret({
        session_id: session.id,
        raw_input: state.rawInput,
      });
      patch({
        sessionId: session.id,
        interpretation: result.interpretation,
        step: "interpret",
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-base font-semibold mb-2" style={{ color: "var(--skin-ink)" }}>
          What do you want to achieve?
        </label>
        <textarea
          value={state.rawInput}
          onChange={(e) => patch({ rawInput: e.target.value })}
          rows={8}
          placeholder="Describe your goal in your own words…"
          className="w-full rounded-xl p-3 text-sm outline-none resize-y"
          style={{ background: "var(--skin-bg)", border: "1px solid var(--skin-line)", color: "var(--skin-ink)" }}
        />
      </div>

      {error && (
        <p className="text-sm" style={{ color: "var(--accent-yellow, #E6A817)" }}>
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={submitting || !state.rawInput.trim()}
        onClick={submit}
        className="w-full rounded-xl py-3 font-semibold inline-flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
        style={{ background: "var(--skin-accent)", color: "#fff" }}
      >
        {submitting && <Loader2 className="animate-spin" size={16} />}
        Continue
      </button>
    </div>
  );
}
