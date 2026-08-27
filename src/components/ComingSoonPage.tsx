import type { LucideIcon } from "lucide-react";

// Full-page "coming soon" placeholder — same layout AiPlanPage established.
// Reused by the Phase 4 dashboard routes so every not-yet-built full page looks
// and behaves the same way.
export function ComingSoonPage({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        gap: 16,
        color: "var(--skin-ink-soft)",
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          border: "1.5px solid var(--skin-line)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--skin-accent)",
        }}
      >
        <Icon size={26} />
      </div>
      <div style={{ textAlign: "center" }}>
        <p
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: "var(--skin-ink)",
            marginBottom: 6,
          }}
        >
          {title}
        </p>
        <p style={{ fontSize: 14, color: "var(--skin-ink-soft)", maxWidth: 320 }}>
          {subtitle}
        </p>
      </div>
    </div>
  );
}
