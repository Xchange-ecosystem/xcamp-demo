import { useEffect } from "react";
import { ChevronLeft } from "lucide-react";
import { DetailComingSoonPlaceholder } from "@/components/DetailComingSoonPlaceholder";

// Fullscreen shell for note types that don't have a real detail view yet.
// Mirrors TaskFullscreenModal's backdrop/dialog treatment for visual
// consistency, but is a separate component — TaskFullscreenModal itself is
// left untouched (see FullscreenDispatcher for why).
interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function NoteDetailPlaceholderModal({ isOpen, onClose }: Props) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 40,
          background: "rgba(0,0,0,0.10)",
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
          transition: "opacity 0.15s ease-out",
        }}
      />

      {/* Modal shell */}
      <div
        role="dialog"
        aria-modal="true"
        data-testid="note-detail-placeholder-modal"
        data-open={isOpen ? "true" : "false"}
        style={{
          position: "fixed",
          inset: 16,
          zIndex: 50,
          background: "var(--skin-surface)",
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? "scale(1)" : "scale(0.98)",
          pointerEvents: isOpen ? "auto" : "none",
          transition: "opacity 0.15s ease-out, transform 0.15s ease-out",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 20px",
            borderBottom: "1px solid var(--skin-line)",
            background: "var(--skin-surface2)",
            flexShrink: 0,
          }}
        >
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--skin-ink-faint)",
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 13,
              padding: "4px 8px 4px 4px",
              borderRadius: 6,
            }}
          >
            <ChevronLeft size={15} />
            Close
          </button>
        </div>
        <DetailComingSoonPlaceholder />
      </div>
    </>
  );
}
