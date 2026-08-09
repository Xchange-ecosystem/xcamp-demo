import { useEffect } from "react";
import { SidepanelProvider } from "@/contexts/sidepanel";
import { useFullscreenTaskStore } from "@/store/fullscreenTaskStore";
import { TaskPageContent } from "@/routes/task.$taskId";

export function TaskFullscreenModal() {
  const { taskId, close } = useFullscreenTaskStore();
  const isOpen = taskId !== null;

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={close}
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
        {taskId !== null && (
          <SidepanelProvider>
            <TaskPageContent taskId={taskId} onClose={close} />
          </SidepanelProvider>
        )}
      </div>
    </>
  );
}
