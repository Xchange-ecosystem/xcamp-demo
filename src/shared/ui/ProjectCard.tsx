import type { ProjectFull } from "@/types/xcamp";

interface Props {
  project: ProjectFull;
  onClick?: () => void;
  selected?: boolean;
}

export function ProjectCard({ project, onClick, selected }: Props) {
  const banner = project.feature_image
    ? `url(${project.feature_image})`
    : project.color
      ? project.color
      : "var(--skin-accent-gradient)";

  const isBgImage = !!project.feature_image;

  return (
    <button
      onClick={onClick}
      style={{
        all: "unset",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        borderRadius: 12,
        overflow: "hidden",
        border: selected ? "2px solid var(--skin-accent)" : "2px solid var(--skin-line)",
        background: "var(--skin-surface)",
        transition: "border-color 0.15s",
        width: "100%",
      }}
    >
      <div
        style={{
          height: 80,
          background: isBgImage ? banner : undefined,
          backgroundImage: isBgImage ? banner : "var(--skin-accent-gradient)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div style={{ padding: "10px 12px" }}>
        <p
          style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 600,
            color: "var(--skin-ink)",
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
              margin: "4px 0 0",
              fontSize: 12,
              color: "var(--skin-ink-soft)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {project.description}
          </p>
        )}
      </div>
    </button>
  );
}
