import type { ObjectiveProgress, ProjectPortfolioItem } from "@/lib/xcamp-api";
import type { XcampUser } from "@/types/xcamp";

interface Props {
  project: ProjectPortfolioItem;
  progress: ObjectiveProgress | undefined;
  user: XcampUser;
  onClick: () => void;
  selected: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  creator: "Owner",
  manager: "Manager",
  editor: "Editor",
  viewer: "Viewer",
};

export function PortfolioProjectCard({ project, progress, user, onClick, selected }: Props) {
  const isOwner = project.owner_central_id === user.centralId;
  const roleLabel = isOwner ? "Owner" : (project.collab_role ? ROLE_LABELS[project.collab_role] ?? project.collab_role : null);

  const coverStyle: React.CSSProperties = project.feature_image
    ? {
        backgroundImage: `url(${project.feature_image})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : project.color
      ? { background: project.color }
      : { background: "var(--skin-accent-gradient)" };

  const total = progress?.total ?? 0;
  const done = progress?.done ?? 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        all: "unset",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        borderRadius: "var(--xr-lg, 10px)",
        overflow: "hidden",
        border: selected
          ? "2px solid var(--skin-accent)"
          : "2px solid var(--skin-line)",
        background: "var(--skin-surface)",
        boxShadow: "var(--shadow-card)",
        transition: "border-color 0.15s, box-shadow 0.15s",
        width: "100%",
        textAlign: "left",
      }}
    >
      {/* Cover */}
      <div style={{ height: 88, position: "relative", ...coverStyle }}>
        {roleLabel && (
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
            }}
          >
            {roleLabel}
          </span>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: "10px 12px 8px", flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
        <p
          style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 600,
            color: "var(--skin-ink)",
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

        {project.tags && project.tags.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 2 }}>
            {project.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  padding: "1px 6px",
                  borderRadius: "var(--xr-pill, 999px)",
                  background: "var(--skin-accent-soft)",
                  color: "var(--skin-ink-soft)",
                  whiteSpace: "nowrap",
                }}
              >
                {tag}
              </span>
            ))}
            {project.tags.length > 4 && (
              <span
                style={{
                  fontSize: 10,
                  color: "var(--skin-ink-faint)",
                  lineHeight: "1.6",
                }}
              >
                +{project.tags.length - 4}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "6px 12px 10px",
          borderTop: "1px solid var(--skin-line-soft)",
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        {total > 0 && (
          <div>
            <div
              style={{
                height: 3,
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
          </div>
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 11,
            color: "var(--skin-ink-faint)",
          }}
        >
          <span>
            {total > 0
              ? `${done}/${total} objective${total !== 1 ? "s" : ""}`
              : "No objectives"}
          </span>
          {project.collaborator_count > 0 && (
            <span>{project.collaborator_count} member{project.collaborator_count !== 1 ? "s" : ""}</span>
          )}
        </div>
      </div>
    </button>
  );
}
