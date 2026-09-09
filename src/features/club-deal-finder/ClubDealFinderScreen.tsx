// Club Deal Finder (B4 Stage 2) — the investor's deal pipeline as a four-stage
// board. Consumes the shared NavigatorBoard shell rather than standing up a
// second column layout.
//
// Card styling reproduces src/features/portfolio/PortfolioProjectCard.tsx
// (the main app's real Portfolio card) deliberately and closely: 2px border
// going accent on select, 88px cover band with a pill bottom-right, title /
// clamped description / tag pills, and a footer with a 3px progress bar over a
// two-slot metadata row. Two substitutions, both intentional:
//   - the cover pill shows project status, not the viewer's role — there is no
//     "my role" on a project you are only considering investing in
//   - the footer's right slot shows the watch count instead of member count:
//     how many *other* investors sit at this card's current stage
//
// Everything here is presentational. Moving a card changes local state only;
// "Request info" flips a local flag and makes no call. Per the standing rule,
// no presenter change survives a refresh.
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, Lock } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { CLUB_DEAL_STAGES, INITIAL_DEAL_STAGES, getWatchCount } from "@/fixtures/clubDeals";
import { OBJECTIVES } from "@/fixtures/objectives";
import { PROJECTS } from "@/fixtures/projects";
import type { ClubDealStage, Project } from "@/fixtures/types";
import { NavigatorBoard, type BoardColumn } from "@/components/demo/NavigatorBoard";

const STAGE_ORDER: ClubDealStage[] = CLUB_DEAL_STAGES.map((s) => s.key);

function objectiveProgress(projectId: string): { done: number; total: number; pct: number } {
  const objectives = OBJECTIVES.filter((o) => o.projectId === projectId);
  const done = objectives.filter((o) => o.status === "done").length;
  const total = objectives.length;
  return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
}

export function ClubDealFinderScreen() {
  const [stages, setStages] = useState<Record<string, ClubDealStage>>(() => ({
    ...INITIAL_DEAL_STAGES,
  }));
  const [requested, setRequested] = useState<Record<string, boolean>>({});

  const move = (projectId: string, direction: -1 | 1) => {
    setStages((prev) => {
      const current = prev[projectId] ?? "watchlist";
      const next = STAGE_ORDER[STAGE_ORDER.indexOf(current) + direction];
      return next ? { ...prev, [projectId]: next } : prev;
    });
  };

  const columns: BoardColumn[] = useMemo(
    () =>
      CLUB_DEAL_STAGES.map((stage) => {
        const projects = PROJECTS.filter((p) => (stages[p.id] ?? "watchlist") === stage.key);
        return {
          key: stage.key,
          label: stage.label,
          hint: stage.hint,
          count: projects.length,
          tone: stage.key === "committed" ? ("grave" as const) : ("default" as const),
          empty: "No projects at this stage.",
          children: projects.map((project) => (
            <DealCard
              key={project.id}
              project={project}
              stage={stage.key}
              requested={!!requested[project.id]}
              onRequest={() => setRequested((r) => ({ ...r, [project.id]: true }))}
              onMove={(d) => move(project.id, d)}
            />
          )),
        };
      }),
    [stages, requested],
  );

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
      <h1 className="mb-1.5 text-xl font-semibold tracking-tight text-foreground">
        Club Deal Finder
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Where each project sits in your pipeline, and how many other investors are at the same
        stage. Moving a card is presentational — nothing here is saved.
      </p>

      <NavigatorBoard columns={columns} />
    </div>
  );
}

function DealCard({
  project,
  stage,
  requested,
  onRequest,
  onMove,
}: {
  project: Project;
  stage: ClubDealStage;
  requested: boolean;
  onRequest: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const { done, total, pct } = objectiveProgress(project.id);
  const watchCount = getWatchCount(project.id, stage);
  const grave = stage === "committed";
  const stageIndex = STAGE_ORDER.indexOf(stage);

  const coverStyle: React.CSSProperties = project.featureImage
    ? {
        backgroundImage: `url(${project.featureImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : { background: project.color };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        borderRadius: "var(--xr-lg, 10px)",
        overflow: "hidden",
        // Committed keeps the same 2px weight but drops the accent entirely —
        // the gravity register, not a highlight.
        border: grave ? "2px solid var(--gravity-line)" : "2px solid var(--skin-line)",
        background: "var(--skin-surface)",
        boxShadow: grave ? "none" : "var(--shadow-card)",
        // No transition on a binding stage: nothing here should animate.
        transition: grave ? "none" : "border-color 0.15s, box-shadow 0.15s",
        width: "100%",
        textAlign: "left",
      }}
    >
      {/* Cover */}
      <div style={{ height: 88, position: "relative", ...coverStyle }}>
        {grave && (
          // Mute the project's own colour under a contract — the brand stops
          // being the loudest thing on the card.
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "var(--gravity-bg)",
              opacity: 0.72,
            }}
          />
        )}
        <span
          style={{
            position: "absolute",
            bottom: 8,
            right: 8,
            fontSize: 11,
            fontWeight: 600,
            padding: "2px 8px",
            borderRadius: "var(--xr-pill, 999px)",
            background: "rgba(0,0,0,0.45)",
            color: "#fff",
            letterSpacing: "0.02em",
            textTransform: "capitalize",
          }}
        >
          {project.status}
        </span>
      </div>

      {/* Body */}
      <div
        style={{
          padding: "10px 12px 8px",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 600,
            color: grave ? "var(--gravity-ink)" : "var(--skin-ink)",
            fontFamily: "var(--skin-font-head)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {project.name}
        </p>

        {project.description && (
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: "var(--skin-ink-soft)",
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              lineHeight: "1.4",
            }}
          >
            {project.description}
          </p>
        )}

        {project.tags.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 2 }}>
            {project.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  padding: "1px 6px",
                  borderRadius: "var(--xr-pill, 999px)",
                  background: grave ? "transparent" : "var(--skin-accent-soft)",
                  border: grave ? "1px solid var(--gravity-line)" : "1px solid transparent",
                  color: grave ? "var(--gravity-ink)" : "var(--skin-ink-soft)",
                  whiteSpace: "nowrap",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Stage-specific affordance. Shortlist unlocks the Data Room; Deciding
            is where you ask for what you are still missing. */}
        {stage === "shortlist" && (
          <Link
            to="/demo/investor/microapps/data-room"
            style={{
              marginTop: 6,
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: 11.5,
              fontWeight: 500,
              color: "var(--skin-accent)",
            }}
          >
            <Eye size={12} />
            Open Data Room
          </Link>
        )}
        {stage === "deciding" && (
          <button
            type="button"
            onClick={onRequest}
            disabled={requested}
            style={{
              marginTop: 6,
              alignSelf: "flex-start",
              fontSize: 11.5,
              fontWeight: 500,
              padding: "3px 9px",
              borderRadius: "var(--xr, 6px)",
              border: "1px solid var(--skin-line)",
              background: "var(--skin-surface2)",
              color: requested ? "var(--skin-ink-faint)" : "var(--skin-ink-soft)",
              cursor: requested ? "default" : "pointer",
            }}
          >
            {requested ? "Info requested" : "Request more info"}
          </button>
        )}
        {grave && (
          <div
            style={{
              marginTop: 6,
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: 11.5,
              color: "var(--gravity-ink)",
            }}
          >
            <Lock size={12} />
            Terms signed. Binding.
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "6px 12px 10px",
          borderTop: `1px solid ${grave ? "var(--gravity-line)" : "var(--skin-line-soft)"}`,
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        {total > 0 && (
          <div
            style={{
              height: 3,
              borderRadius: 999,
              background: grave ? "var(--gravity-line)" : "var(--skin-line)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${pct}%`,
                background: grave ? "var(--gravity-ink)" : "var(--skin-accent)",
                borderRadius: 999,
                transition: grave ? "none" : "width 0.3s ease",
              }}
            />
          </div>
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 11,
            color: grave ? "var(--gravity-ink)" : "var(--skin-ink-faint)",
          }}
        >
          <span>
            {total > 0 ? `${done}/${total} objective${total !== 1 ? "s" : ""}` : "No objectives"}
          </span>
          <span title={`${watchCount} other investors at this stage`}>{watchCount} watching</span>
        </div>

        {/* Presentational stage movement. Buttons rather than drag: keyboard
            reachable, no dependency, and nothing to persist either way. */}
        <div style={{ display: "flex", gap: 4, marginTop: 2 }}>
          <StageButton
            label={`Move ${project.name} back a stage`}
            disabled={stageIndex === 0}
            onClick={() => onMove(-1)}
            grave={grave}
          >
            <ChevronLeft size={13} />
          </StageButton>
          <StageButton
            label={`Move ${project.name} forward a stage`}
            disabled={stageIndex === STAGE_ORDER.length - 1}
            onClick={() => onMove(1)}
            grave={grave}
          >
            <ChevronRight size={13} />
          </StageButton>
        </div>
      </div>
    </div>
  );
}

function StageButton({
  label,
  disabled,
  onClick,
  grave,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  grave: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flex: 1,
        padding: "2px 0",
        borderRadius: "var(--xr, 6px)",
        border: `1px solid ${grave ? "var(--gravity-line)" : "var(--skin-line)"}`,
        background: "transparent",
        color: disabled ? "var(--skin-ink-faint)" : "var(--skin-ink-soft)",
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? "default" : "pointer",
      }}
    >
      {children}
    </button>
  );
}
