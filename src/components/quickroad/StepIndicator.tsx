import type { QuickRoadStep } from "@/hooks/useQuickRoad";

const STEPS: { key: QuickRoadStep; label: string }[] = [
  { key: "input", label: "Input" },
  { key: "interpret", label: "Confirm" },
  { key: "generate", label: "Plan" },
];

export function StepIndicator({ current }: { current: QuickRoadStep }) {
  const currentIdx = STEPS.findIndex((s) => s.key === current);

  return (
    <div className="flex items-center justify-center gap-2 py-4">
      {STEPS.map((step, idx) => {
        const done = idx < currentIdx;
        const active = idx === currentIdx;
        return (
          <div key={step.key} className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <span
                className="rounded-full transition-all"
                style={{
                  width: active ? 12 : 10,
                  height: active ? 12 : 10,
                  background:
                    done || active ? "var(--skin-accent)" : "var(--skin-line)",
                  opacity: done ? 0.6 : 1,
                }}
              />
              <span
                className="text-[10px] uppercase tracking-wide hidden sm:block"
                style={{
                  color: active ? "var(--skin-accent)" : "var(--skin-ink-soft)",
                  fontWeight: active ? 600 : 400,
                }}
              >
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <span
                className="h-px w-6 sm:w-10"
                style={{ background: "var(--skin-line)" }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
