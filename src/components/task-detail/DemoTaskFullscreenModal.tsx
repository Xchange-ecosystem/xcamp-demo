import { useEffect } from "react";
import { DemoTaskPageContent } from "@/components/task-detail/DemoTaskPageContent";

// Demo counterpart to TaskFullscreenModal — same backdrop/dialog shell
// (mirrored rather than reused, same discipline as
// NoteDetailPlaceholderModal's comment on TaskFullscreenModal: that
// component is left untouched, and it hardcodes the real, auth-gated
// TaskPageContent internally, so it can't be reused for the demo path
// without editing it in place). Driven by props instead of
// useFullscreenTaskStore — see DemoFullscreenDispatcher.
export function DemoTaskFullscreenModal({
  isOpen,
  taskId,
  onClose,
}: {
  isOpen: boolean;
  taskId: string | null;
  onClose: () => void;
}) {
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
        data-testid="demo-task-fullscreen-modal"
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
        }}
      >
        {taskId !== null && <DemoTaskPageContent taskId={taskId} onClose={onClose} />}
      </div>
    </>
  );
}
