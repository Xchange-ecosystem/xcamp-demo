import { PartyPopper, ExternalLink } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { DEEP_LINK_BASE } from "@/lib/backcaster-api";
import type { useQuickRoad } from "@/hooks/useQuickRoad";

export function SuccessScreen({ qr }: { qr: ReturnType<typeof useQuickRoad> }) {
  const { state } = qr;
  const navigate = useNavigate();
  const projectId = state.materializedProjectId;

  return (
    <div className="text-center py-12 space-y-5">
      <div
        className="mx-auto flex items-center justify-center rounded-full"
        style={{ width: 72, height: 72, background: "rgba(22,184,154,0.15)" }}
      >
        <PartyPopper size={34} style={{ color: "var(--skin-accent)" }} />
      </div>
      <div>
        <h2 className="text-xl font-semibold" style={{ color: "var(--skin-ink)" }}>
          Your project is live!
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--skin-ink-soft)" }}>
          {state.projectTitleOverride || state.outputTree?.title || "Your project"} is ready in Xcamp.
        </p>
      </div>

      {projectId && (
        <a
          href={`${DEEP_LINK_BASE}/${projectId}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-xl px-6 py-3 font-semibold"
          style={{ background: "var(--skin-accent)", color: "#fff" }}
        >
          Open in Xcamp <ExternalLink size={16} />
        </a>
      )}

      <div>
        <button
          type="button"
          onClick={() => navigate({ to: "/" })}
          className="rounded-xl px-5 py-2.5 text-sm font-medium"
          style={{ background: "var(--skin-surface)", color: "var(--skin-ink-soft)", border: "1px solid var(--skin-line)" }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
