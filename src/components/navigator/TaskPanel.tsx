import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { NoteEditor, type NoteEditorValues, type Editing } from "@/components/editor/NoteEditor";
import type { NoteRow, ProjectRow, XcampUser } from "@/types/xcamp";

const STORAGE_KEY = "nox-founder-task-panel-width";
const DEFAULT_WIDTH = 360;
const MIN_WIDTH = 240;

function getInitialWidth(): number {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return Math.max(MIN_WIDTH, parseInt(stored, 10));
  } catch {
    // ignore
  }
  return DEFAULT_WIDTH;
}

export function TaskPanel({
  note,
  projects,
  user,
  saving,
  archiving,
  onSave,
  onClose,
  onArchive,
}: {
  note: NoteRow | null;
  projects: ProjectRow[];
  user: XcampUser;
  saving: boolean;
  archiving: boolean;
  onSave: (values: NoteEditorValues, note: NoteRow) => void;
  onClose: () => void;
  onArchive: (note: NoteRow) => void;
}) {
  const [width, setWidth] = useState(getInitialWidth);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);

  // Clamp width to 30vw max on mount and resize
  useEffect(() => {
    const clamp = () => {
      const max = Math.max(DEFAULT_WIDTH, Math.floor(window.innerWidth * 0.3));
      setWidth((w) => Math.min(w, max));
    };
    clamp();
    window.addEventListener("resize", clamp);
    return () => window.removeEventListener("resize", clamp);
  }, []);

  // Escape key closes panel
  useEffect(() => {
    if (!note) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [note, onClose]);

  const onDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragStartWidth.current = width;

    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = dragStartX.current - ev.clientX;
      const max = Math.max(DEFAULT_WIDTH, Math.floor(window.innerWidth * 0.3));
      const next = Math.min(Math.max(MIN_WIDTH, dragStartWidth.current + delta), max);
      setWidth(next);
    };

    const onUp = (ev: MouseEvent) => {
      isDragging.current = false;
      const delta = dragStartX.current - ev.clientX;
      const max = Math.max(DEFAULT_WIDTH, Math.floor(window.innerWidth * 0.3));
      const next = Math.min(Math.max(MIN_WIDTH, dragStartWidth.current + delta), max);
      setWidth(next);
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        /* ignore */
      }
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  if (!note) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width,
        zIndex: 40,
        background: "var(--skin-surface)",
        borderLeft: "1px solid var(--skin-line)",
        display: "flex",
        flexDirection: "column",
        boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
      }}
    >
      {/* Drag handle — left edge */}
      <div
        onMouseDown={onDragStart}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 6,
          cursor: "col-resize",
          zIndex: 1,
        }}
      />

      {/* Panel header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          borderBottom: "1px solid var(--skin-line)",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            color: "var(--skin-ink-faint)",
          }}
        >
          Task
        </span>
        <button
          onClick={onClose}
          aria-label="Close panel"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--skin-ink-faint)",
            padding: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 4,
          }}
        >
          <X size={15} />
        </button>
      </div>

      {/* NoteEditor */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 24px" }}>
        <NoteEditor
          key={note.id}
          editing={{ mode: "edit", note } as Editing}
          projects={projects}
          user={user}
          saving={saving}
          archiving={archiving}
          onCancel={onClose}
          onSave={(values) => onSave(values, note)}
          onArchive={() => onArchive(note)}
        />
      </div>
    </div>
  );
}
