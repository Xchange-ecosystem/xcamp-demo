import { createFileRoute } from "@tanstack/react-router";
import { Compass } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useQuickRoad } from "@/hooks/useQuickRoad";
import { StepIndicator } from "@/components/quickroad/StepIndicator";
import { InputStep } from "@/components/quickroad/InputStep";
import { InterpretStep } from "@/components/quickroad/InterpretStep";
import { GenerateStep } from "@/components/quickroad/GenerateStep";
import { SuccessScreen } from "@/components/quickroad/SuccessScreen";
import { WorkflowDiagnostics } from "@/components/quickroad/WorkflowDiagnostics";

export const Route = createFileRoute("/project-builder")({
  head: () => ({
    meta: [
      { title: "Project Builder — Xcamp" },
      { name: "description", content: "Turn a goal into a project skeleton with the Backcaster Quick Road." },
    ],
  }),
  component: ProjectBuilderPage,
});

function ProjectBuilderPage() {
  const qr = useQuickRoad();
  const { state } = qr;
  const showSuccess = Boolean(state.materializedProjectId);

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-2xl px-4 sm:px-6 py-6 sm:py-10">
        <header className="text-center mb-2">
          <div
            className="mx-auto mb-3 flex items-center justify-center rounded-2xl"
            style={{ width: 48, height: 48, background: "rgba(22,184,154,0.12)" }}
          >
            <Compass size={24} style={{ color: "var(--skin-accent)" }} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--skin-ink)" }}>
            Project Builder
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--skin-ink-soft)" }}>
            Feeling stuck? Tell me your goal and I'll shape a gentle first plan.
          </p>
        </header>

        {!showSuccess && <StepIndicator current={state.step} />}

        <div
          className="rounded-2xl p-4 sm:p-6 mt-2"
          style={{ background: "var(--skin-bg)", border: "1px solid var(--skin-line)" }}
        >
          {showSuccess ? (
            <SuccessScreen qr={qr} />
          ) : (
            <>
              {state.step === "input" && <InputStep qr={qr} />}
              {state.step === "interpret" && <InterpretStep qr={qr} />}
              {state.step === "generate" && <GenerateStep qr={qr} />}
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
