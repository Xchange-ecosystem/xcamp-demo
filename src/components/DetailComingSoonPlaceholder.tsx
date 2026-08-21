// Shared placeholder content for note types that don't have a real detail
// view yet. Content-only — callers supply their own chrome (modal shell,
// page wrapper, etc.).
export function DetailComingSoonPlaceholder() {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 200,
        color: "var(--skin-ink-soft)",
        fontSize: 15,
      }}
    >
      Detail view coming soon.
    </div>
  );
}
