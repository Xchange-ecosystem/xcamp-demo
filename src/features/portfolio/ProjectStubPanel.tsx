import { Link } from "@tanstack/react-router";
import { ExternalLink, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ObjectiveProgress, ProjectPortfolioItem } from "@/lib/xcamp-api";
import type { XcampUser } from "@/types/xcamp";

interface Props {
  project: ProjectPortfolioItem | null;
  progress: ObjectiveProgress | undefined;
  user: XcampUser;
  onClose: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  creator: "Owner",
  manager: "Manager",
  editor: "Editor",
  viewer: "Viewer",
};

export function ProjectStubPanel({ project, progress, user, onClose }: Props) {
  const isOpen = project !== null;
  const isOwner = project ? project.owner_central_id === user.centralId : false;
  const roleLabel = project
    ? isOwner
      ? "Owner"
      : (project.collab_role ? ROLE_LABELS[project.collab_role] ?? project.collab_role : null)
    : null;

  const total = progress?.total ?? 0;
  const done = progress?.done ?? 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const coverStyle: React.CSSProperties = project?.feature_image
    ? {
        backgroundImage: `url(${project.feature_image})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : project?.color
      ? { background: project.color }
      : { background: "var(--skin-accent-gradient)" };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent
        side="right"
        noCloseButton
        style={{
          width: 400,
          maxWidth: "90vw",
          background: "var(--skin-surface)",
          borderLeft: "1px solid var(--skin-line)",
          display: "flex",
          flexDirection: "column",
          padding: 0,
          overflow: "hidden",
        }}
      >
        {/* Cover */}
        <div style={{ height: 120, flexShrink: 0, position: "relative", ...coverStyle }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              all: "unset",
              position: "absolute",
              top: 10,
              right: 10,
              cursor: "pointer",
              background: "rgba(0,0,0,0.4)",
              borderRadius: "50%",
              width: 28,
              height: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px 24px" }}>
          <SheetHeader style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
              <SheetTitle
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: "var(--skin-ink)",
                  fontFamily: "var(--skin-font-head)",
                  lineHeight: 1.2,
                }}
              >
                {project?.name ?? ""}
              </SheetTitle>
              {roleLabel && (
                <span
                  style={{
                    flexShrink: 0,
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "3px 9px",
                    borderRadius: "var(--xr-pill, 999px)",
                    background: "var(--skin-accent-soft)",
                    color: "var(--skin-ink-soft)",
                  }}
                >
                  {roleLabel}
                </span>
              )}
            </div>
          </SheetHeader>

          {project?.description && (
            <p
              style={{
                margin: "0 0 16px",
                fontSize: 14,
                color: "var(--skin-ink-soft)",
                lineHeight: 1.6,
              }}
            >
              {project.description}
            </p>
          )}

          {/* Tags */}
          {project?.tags && project.tags.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
              {project.tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    padding: "2px 8px",
                    borderRadius: "var(--xr-pill, 999px)",
                    background: "var(--skin-surface2)",
                    color: "var(--skin-ink-soft)",
                    border: "1px solid var(--skin-line)",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Objective progress */}
          <div
            style={{
              padding: "14px 16px",
              borderRadius: "var(--xr-lg, 10px)",
              background: "var(--skin-surface2)",
              marginBottom: 20,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12,
                color: "var(--skin-ink-soft)",
                marginBottom: 8,
                fontWeight: 500,
              }}
            >
              <span>Objectives</span>
              <span style={{ color: "var(--skin-ink)" }}>{done}/{total}</span>
            </div>
            <div
              style={{
                height: 4,
                borderRadius: 999,
                background: "var(--skin-line)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${pct}%`,
                  background: "var(--skin-accent)",
                  borderRadius: 999,
                  transition: "width 0.3s ease",
                }}
              />
            </div>
            {total === 0 && (
              <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--skin-ink-faint)" }}>
                No objectives yet
              </p>
            )}
          </div>

          {/* Members */}
          {project && project.collaborator_count > 0 && (
            <p style={{ fontSize: 13, color: "var(--skin-ink-soft)", marginBottom: 20 }}>
              {project.collaborator_count} team member{project.collaborator_count !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        {/* Footer CTA */}
        <div
          style={{
            padding: "12px 24px",
            borderTop: "1px solid var(--skin-line)",
            flexShrink: 0,
          }}
        >
          {project && (
            <Link
              to="/project/$projectId"
              params={{ projectId: project.id }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "9px 16px",
                borderRadius: "var(--xr, 6px)",
                background: "var(--skin-accent)",
                color: "var(--skin-on-accent)",
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Open project
              <ExternalLink size={14} />
            </Link>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
