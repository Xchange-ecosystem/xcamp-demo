import { createFileRoute } from "@tanstack/react-router";
import { Compass } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeroShell } from "@/components/PageHeroShell";
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
      <PageHeroShell
        seed="project-builder"
        logo={<Compass size={22} style={{ color: "var(--skin-accent)" }} />}
        title="Project Builder"
        subtitle="Feeling stuck? Tell me your goal and I'll shape a gentle first plan."
      >
        <div className="px-4 sm:px-5 pb-5 pt-2">
          {!showSuccess && <StepIndicator current={state.step} />}
          <div className="mt-2">
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
          {!showSuccess && import.meta.env.DEV && <WorkflowDiagnostics qr={qr} />}
        </div>
      </PageHeroShell>
    </AppShell>
  );
}
