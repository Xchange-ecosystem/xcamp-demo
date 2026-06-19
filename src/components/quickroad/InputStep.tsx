import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { createSession, interpret, listModes } from "@/lib/backcaster-api";
import type { useQuickRoad } from "@/hooks/useQuickRoad";

export function InputStep({ qr }: { qr: ReturnType<typeof useQuickRoad> }) {
  const { state, patch, setStage } = qr;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modesLoading, setModesLoading] = useState(!state.selectedModeId);

  // Silently fetch modes and auto-pick the required BPMO framework mode.
  useEffect(() => {
    if (state.selectedModeId) {
      setModesLoading(false);
      setStage("modes", "ok");
      return;
    }
    setModesLoading(true);
    setStage("modes", "running", { endpoint: "GET /modes" });
    listModes()
      .then((all) => {
        const active = all.filter((m) => m.status === "active");
        if (!active.length) {
          if (all.length) {
            setError("No active planning modes are available right now.");
            setStage("modes", "failed", { error: "No active planning modes." });
          }
          return;
        }
        // This simplified Backcaster always uses the BMPO mode.
        const isBmpo = (m: { name?: string; slug?: string; category?: string }) =>
          [m.name, m.slug, m.category].some((v) => {
            const value = (v ?? "").toLowerCase();
            return value.includes("bpmo") || value.includes("bmpo");
          });
        const bmpo = active.find(isBmpo);
        if (!bmpo) {
          setError("The BPMO planning mode is not available right now.");
          setStage("modes", "failed", { error: "BPMO mode not found." });
          return;
        }
        setError(null);
        patch({ selectedModeId: bmpo.id });
        setStage("modes", "ok");
      })
      .catch((e) => {
        setError((e as Error).message);
        setStage("modes", "failed", { error: (e as Error).message });
      })
      .finally(() => setModesLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async () => {
    if (!state.rawInput.trim()) return;
    if (!state.selectedModeId || modesLoading) {
      setError("Still getting ready — please try again in a moment.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      setStage("session", "running", { endpoint: "POST /sessions", error: null });
      const session = await createSession({
        mode_id: state.selectedModeId,
        raw_input: state.rawInput,
      });
      if (!session?.id) {
        throw new Error("No session id was returned by the server.");
      }
      setStage("session", "ok");

      setStage("interpret", "running", { endpoint: "POST /interpret" });
      const result = await interpret({
        session_id: session.id,
        raw_input: state.rawInput,
      });
      setStage("interpret", "ok");
      patch({
        sessionId: session.id,
        interpretation: result.interpretation,
        projectTitleOverride: result.suggestedTitle || "",
        step: "interpret",
      });
    } catch (e) {
      const msg = (e as Error).message;
      setError(msg);
      // Mark whichever stage was running as failed.
      if (state.diag.stages.session === "running") setStage("session", "failed", { error: msg });
      else setStage("interpret", "failed", { error: msg });
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
        disabled={submitting || modesLoading || !state.rawInput.trim()}
        onClick={submit}
        className="w-full rounded-xl py-3 font-semibold inline-flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
        style={{ background: "var(--skin-accent)", color: "#fff" }}
      >
        {(submitting || modesLoading) && <Loader2 className="animate-spin" size={16} />}
        {modesLoading ? "Preparing BPMO mode" : "Continue"}
      </button>
    </div>
  );
}
