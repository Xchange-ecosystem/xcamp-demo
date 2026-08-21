// Shared banner for the /sandbox/* throwaway comparison routes. Not used
// by any real app surface.
export function SandboxBanner({ label, note }: { label: string; note: string }) {
  return (
    <div
      style={{
        background: "#111827",
        color: "#e5e7eb",
        padding: "10px 20px",
        fontSize: 12,
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <strong style={{ fontWeight: 600 }}>Sandbox — {label}</strong>
      <span style={{ opacity: 0.75 }}>{note}</span>
    </div>
  );
}
