import { useEffect, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { listModes, type BackcasterMode } from "@/lib/backcaster-api";
import type { useQuickRoad } from "@/hooks/useQuickRoad";

export function ModeSelectStep({ qr }: { qr: ReturnType<typeof useQuickRoad> }) {
  const { state, patch } = qr;
  const [modes, setModes] = useState<BackcasterMode[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    listModes()
      .then((all) => {
        const active = all.filter((m) => m.is_active);
        setModes(active);
        if (active.length) {
          const lowest = [...active].sort((a, b) => a.default_depth - b.default_depth)[0];
          patch({ selectedModeId: state.selectedModeId ?? lowest.id });
          // Skip step automatically if only one mode exists.
          if (active.length === 1) patch({ selectedModeId: lowest.id, step: "input" });
        }
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12" style={{ color: "var(--skin-ink-soft)" }}>
        <Loader2 className="animate-spin" size={18} /> Loading modes…
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto mb-3" size={28} style={{ color: "var(--skin-ink-soft)" }} />
        <p style={{ color: "var(--skin-ink)" }}>{error}</p>
        <button onClick={load} className="mt-4 rounded-lg px-4 py-2 text-sm font-medium" style={{ background: "var(--skin-accent)", color: "#fff" }}>
          Try again
        </button>
      </div>
    );
  }

  if (!modes || modes.length === 0) {
    return (
      <p className="text-center py-12" style={{ color: "var(--skin-ink-soft)" }}>
        Backcaster is unavailable right now.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: "var(--skin-ink)" }}>
          Pick a starting point
        </h2>
        <p className="text-sm" style={{ color: "var(--skin-ink-soft)" }}>
          We picked the gentlest option for you — feel free to switch.
        </p>
      </div>

      <div className="space-y-2">
        {modes.map((mode) => {
          const selected = state.selectedModeId === mode.id;
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => patch({ selectedModeId: mode.id })}
              className="w-full text-left rounded-xl p-4 transition-all"
              style={{
                background: "var(--skin-bg)",
                border: `2px solid ${selected ? "var(--skin-accent)" : "var(--skin-line)"}`,
              }}
            >
              <div className="font-medium" style={{ color: "var(--skin-ink)" }}>
                {mode.name}
              </div>
              <div className="text-sm mt-0.5" style={{ color: "var(--skin-ink-soft)" }}>
                {mode.description}
              </div>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        disabled={!state.selectedModeId}
        onClick={() => patch({ step: "input" })}
        className="w-full rounded-xl py-3 font-semibold transition-opacity disabled:opacity-50"
        style={{ background: "var(--skin-accent)", color: "#fff" }}
      >
        Continue
      </button>
    </div>
  );
}
