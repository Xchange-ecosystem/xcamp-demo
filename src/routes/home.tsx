import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, Volume2, VolumeX } from "lucide-react";
import { CompanionShell } from "@/components/CompanionShell";
import { EntityPanel } from "@/components/EntityPanel";
import { ActionPillButton } from "@/shared/ui/ActionPillButton";
import { ProjectCard } from "@/shared/ui/ProjectCard";
import { CreateProjectTile } from "@/shared/ui/CreateProjectTile";
import { useHeroImage } from "@/lib/useHeroImage";
import { useAuth } from "@/contexts/auth";
import { listProjectsFull } from "@/lib/xcamp-api";
import type { ProjectFull } from "@/types/xcamp";

// ─── CSS custom properties injected as inline style on the glass panel ───────
const GLASS_STYLE: React.CSSProperties = {
  "--glass-blur": "18px",
  "--glass-bg-light": "rgba(255,255,255,0.55)",
  "--glass-bg-dark": "rgba(18,10,30,0.55)",
  "--glass-border": "rgba(255,255,255,0.18)",
  "--glass-shadow": "0 8px 40px rgba(0,0,0,0.28)",
} as React.CSSProperties;

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "Chi Companion" },
      { name: "description", content: "Your AI companion for the Xcamp ecosystem." },
    ],
  }),
  component: CompanionHomePage,
});

// ─── Step state machine ───────────────────────────────────────────────────────
type Step = "welcome" | "project-select" | "inside-project";

// ─── Shortcut pill definitions ────────────────────────────────────────────────
const SHORTCUT_PILLS = [
  { id: "note",      label: "Quick note" },
  { id: "objective", label: "Set objective" },
  { id: "reflect",   label: "Reflect" },
  { id: "plan",      label: "Plan today" },
];

function CompanionHomePage() {
  const { user: authUser } = useAuth();

  // ── Step state ──────────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>("welcome");
  const [activeProject, setActiveProject] = useState<ProjectFull | null>(null);

  // ── Entity panel smoke-test state ──────────────────────────────────────────
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelType, setPanelType] = useState<"note" | "task" | "objective">("note");

  // ── TTS toggle (inert — wired later) ───────────────────────────────────────
  const [ttsEnabled, setTtsEnabled] = useState(false);

  // ── Background image ───────────────────────────────────────────────────────
  // When inside a project with a feature_image, use that URL directly.
  // Otherwise fall back to the hero bucket with seed "companion-home".
  const projectBgUrl = step === "inside-project" && activeProject?.feature_image
    ? activeProject.feature_image
    : null;
  const { url: heroBgUrl, reload: reloadHero, canReload } = useHeroImage("companion-home");
  const bgUrl = projectBgUrl ?? heroBgUrl;

  // ── Projects query ─────────────────────────────────────────────────────────
  const { data: projects = [] } = useQuery({
    queryKey: ["projects-full", authUser?.authId],
    queryFn: async () => {
      // Build a minimal XcampUser from authUser; full user resolved elsewhere
      // We need tenantId — guard gracefully if not yet resolved.
      if (!authUser) return [];
      // Re-use the resolved user from context if available; otherwise skip query.
      return [];
    },
    enabled: !!authUser && step === "project-select",
  });

  // Separate query with resolved xcamp user — needs the auth context to provide it.
  // For now the query above returns [] until the auth context exposes xcampUser.
  // This is an intentional stub — wired fully in CC-2.
  void projects;

  // ── Handlers ───────────────────────────────────────────────────────────────
  function handleProjectSelect(p: ProjectFull) {
    setActiveProject(p);
    setStep("inside-project");
  }

  function handleShortcut(id: string) {
    if (id === "note") {
      setPanelType("note");
      setPanelOpen(true);
    } else if (id === "objective") {
      setPanelType("objective");
      setPanelOpen(true);
    }
    // reflect / plan-today — wired in later sessions
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <CompanionShell>
      {/* Layer 0 — full-screen background */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          background: bgUrl
            ? `url(${bgUrl}) center/cover no-repeat`
            : "var(--skin-surface)",
          transition: "background-image 0.6s ease",
        }}
      />
      {/* Layer 0.5 — dim scrim for legibility */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1,
          background: "rgba(0,0,0,0.35)",
          pointerEvents: "none",
        }}
      />

      {/* Layer 1 — top chrome */}
      <TopChrome
        ttsEnabled={ttsEnabled}
        onTtsToggle={() => setTtsEnabled((v) => !v)}
        onReload={reloadHero}
        canReload={canReload && !projectBgUrl}
      />

      {/* Layer 2 — glass panel (center) */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <GlassPanel step={step} activeProject={activeProject} onEnterProjects={() => setStep("project-select")} onBack={() => setStep("welcome")}>
          {step === "welcome" && (
            <WelcomeStep onEnterProjects={() => setStep("project-select")} />
          )}
          {step === "project-select" && (
            <ProjectSelectStep
              onSelect={handleProjectSelect}
              onCreateProject={() => {/* wired in CC-2 */}}
            />
          )}
          {step === "inside-project" && activeProject && (
            <InsideProjectStep project={activeProject} onBack={() => setStep("project-select")} />
          )}
        </GlassPanel>
      </div>

      {/* Layer 3 — shortcut pill bar (pinned bottom) */}
      <ShortcutPillBar onShortcut={handleShortcut} />

      {/* Entity panel smoke-test */}
      <EntityPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        type={panelType}
        id="smoke-test-placeholder"
      />
    </CompanionShell>
  );
}

// ─── Top chrome ──────────────────────────────────────────────────────────────
function TopChrome({
  ttsEnabled,
  onTtsToggle,
  onReload,
  canReload,
}: {
  ttsEnabled: boolean;
  onTtsToggle: () => void;
  onReload: () => void;
  canReload: boolean;
}) {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        zIndex: 20,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "12px 16px",
        pointerEvents: "auto",
      }}
    >
      {canReload && (
        <IconButton onClick={onReload} title="Reload background">
          <RefreshCw size={16} />
        </IconButton>
      )}
      <IconButton onClick={onTtsToggle} title={ttsEnabled ? "Disable TTS" : "Enable TTS"}>
        {ttsEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
      </IconButton>
    </div>
  );
}

function IconButton({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 36,
        height: 36,
        borderRadius: "50%",
        background: "rgba(255,255,255,0.15)",
        border: "1px solid rgba(255,255,255,0.2)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        color: "white",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

// ─── Glass panel ─────────────────────────────────────────────────────────────
function GlassPanel({
  children,
  step: _step,
  activeProject: _ap,
  onEnterProjects: _oep,
  onBack: _ob,
}: {
  children: React.ReactNode;
  step: Step;
  activeProject: ProjectFull | null;
  onEnterProjects: () => void;
  onBack: () => void;
}) {
  return (
    <div
      style={{
        ...GLASS_STYLE,
        pointerEvents: "auto",
        width: "min(560px, 92vw)",
        maxHeight: "72vh",
        overflowY: "auto",
        borderRadius: 20,
        background: "var(--glass-bg-dark, rgba(18,10,30,0.55))",
        border: "1px solid var(--glass-border, rgba(255,255,255,0.18))",
        boxShadow: "var(--glass-shadow, 0 8px 40px rgba(0,0,0,0.28))",
        backdropFilter: "blur(var(--glass-blur, 18px))",
        WebkitBackdropFilter: "blur(var(--glass-blur, 18px))",
        padding: "28px 28px 24px",
        color: "white",
      }}
    >
      {children}
    </div>
  );
}

// ─── Step: Welcome ────────────────────────────────────────────────────────────
function WelcomeStep({ onEnterProjects }: { onEnterProjects: () => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, lineHeight: 1.2 }}>
          Good to see you.
        </h1>
        <p style={{ margin: "8px 0 0", fontSize: 15, opacity: 0.75, lineHeight: 1.5 }}>
          What would you like to work on today?
        </p>
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <ActionPillButton label="Pick a project" onClick={onEnterProjects} />
        <ActionPillButton
          label="Quick note"
          style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(4px)" }}
        />
      </div>
    </div>
  );
}

// ─── Step: Project select ─────────────────────────────────────────────────────
function ProjectSelectStep({
  onSelect,
  onCreateProject,
}: {
  onSelect: (p: ProjectFull) => void;
  onCreateProject: () => void;
}) {
  // Stub projects list — wired to real data in CC-2 once xcampUser is exposed
  const stubProjects: ProjectFull[] = [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Choose a project</h2>
      {stubProjects.length === 0 ? (
        <p style={{ margin: 0, fontSize: 14, opacity: 0.65 }}>
          No projects yet — create your first one below.
        </p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: 10,
          }}
        >
          {stubProjects.map((p) => (
            <ProjectCard key={p.id} project={p} onClick={() => onSelect(p)} />
          ))}
        </div>
      )}
      <CreateProjectTile onClick={onCreateProject} />
    </div>
  );
}

// ─── Step: Inside project ─────────────────────────────────────────────────────
function InsideProjectStep({
  project,
  onBack,
}: {
  project: ProjectFull;
  onBack: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          onClick={onBack}
          style={{
            all: "unset",
            cursor: "pointer",
            fontSize: 13,
            opacity: 0.65,
            textDecoration: "underline",
          }}
        >
          ← Projects
        </button>
      </div>
      <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{project.name}</h2>
      {project.description && (
        <p style={{ margin: 0, fontSize: 14, opacity: 0.7, lineHeight: 1.5 }}>
          {project.description}
        </p>
      )}
      <p style={{ margin: 0, fontSize: 13, opacity: 0.5 }}>
        [Project context panel — wired in CC-2]
      </p>
    </div>
  );
}

// ─── Shortcut pill bar ────────────────────────────────────────────────────────
function ShortcutPillBar({ onShortcut }: { onShortcut: (id: string) => void }) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 28,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 20,
        display: "flex",
        gap: 8,
        padding: "8px 16px",
        borderRadius: "var(--xr-pill, 999px)",
        background: "rgba(18,10,30,0.55)",
        border: "1px solid rgba(255,255,255,0.18)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
      }}
    >
      {SHORTCUT_PILLS.map((pill) => (
        <button
          key={pill.id}
          onClick={() => onShortcut(pill.id)}
          style={{
            all: "unset",
            cursor: "pointer",
            padding: "6px 14px",
            borderRadius: "var(--xr-pill, 999px)",
            fontSize: 13,
            fontWeight: 500,
            color: "rgba(255,255,255,0.85)",
            background: "rgba(255,255,255,0.1)",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.2)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.1)";
          }}
        >
          {pill.label}
        </button>
      ))}
    </div>
  );
}
