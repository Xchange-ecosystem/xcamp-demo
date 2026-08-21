import type { LucideIcon } from "lucide-react";

export function ComingSoonTab({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        minHeight: 320,
        color: "var(--skin-ink-faint)",
        textAlign: "center",
      }}
    >
      <Icon size={28} style={{ opacity: 0.5 }} />
      <p style={{ fontSize: 14, fontWeight: 500, color: "var(--skin-ink-soft)", margin: 0 }}>
        {label}
      </p>
      <p style={{ fontSize: 13, margin: 0 }}>Coming soon.</p>
    </div>
  );
}
