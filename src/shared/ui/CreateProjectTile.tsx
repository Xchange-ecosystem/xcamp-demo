import { Plus } from "lucide-react";

interface Props {
  onClick?: () => void;
}

export function CreateProjectTile({ onClick }: Props) {
  return (
    <button
      onClick={onClick}
      style={{
        all: "unset",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        borderRadius: 12,
        border: "2px dashed var(--skin-line)",
        height: 140,
        width: "100%",
        color: "var(--skin-ink-soft)",
        fontSize: 13,
        fontWeight: 500,
        transition: "border-color 0.15s, color 0.15s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--skin-accent)";
        (e.currentTarget as HTMLButtonElement).style.color = "var(--skin-accent)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--skin-line)";
        (e.currentTarget as HTMLButtonElement).style.color = "var(--skin-ink-soft)";
      }}
    >
      <Plus size={22} />
      New project
    </button>
  );
}
