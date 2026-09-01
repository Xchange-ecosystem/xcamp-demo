import { useEffect } from "react";
import { ChevronLeft, Loader2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth";
import { supabase } from "@/lib/supabase";
import { updateNote } from "@/lib/xcamp-api";
import { NoteEditor, type NoteEditorValues } from "@/components/editor/NoteEditor";
import type { NoteRow } from "@/types/xcamp";

interface Props {
  isOpen: boolean;
  noteId: string | null;
  onClose: () => void;
}

// Fullscreen view for plain notes — a bigger version of the same title +
// rich-text editor NoteEditor already renders everywhere else, with the
// type/project/objectives/tags accordion hidden (hideMeta). Unlike
// TaskFullscreenModal there are no tabs, no accordion, no metrics: this note
// type doesn't have any of that, it just needed more room to write in.
export function NoteFullscreenModal({ isOpen, noteId, onClose }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const { data: note } = useQuery({
    queryKey: ["note-fullscreen", noteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notes")
        .select(
          "id, title, body_html, body_markdown, note_type, tags, detail, tenant_id, owner_central_id, created_at, updated_at",
        )
        .eq("id", noteId!)
        .single();
      if (error) throw error;
      return data as unknown as NoteRow;
    },
    enabled: isOpen && !!noteId,
  });

  const handleSave = async (values: NoteEditorValues) => {
    if (!user || !note) return;
    await updateNote(user, note.id, {
      ...values,
      existingDetail: (note.detail as Record<string, unknown>) ?? {},
    });
    void queryClient.invalidateQueries({ queryKey: ["notes"] });
    void queryClient.invalidateQueries({ queryKey: ["note-fullscreen", note.id] });
  };

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
        data-testid="note-fullscreen-modal"
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

        <div className="x-note-fullscreen-body" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "24px 32px" }}>
          {isOpen && note && user ? (
            <NoteEditor
              key={note.id}
              editing={{ mode: "edit", note }}
              projects={[]}
              user={user}
              saving={false}
              archiving={false}
              onSave={handleSave}
              onCancel={onClose}
              embedded
              hideMeta
            />
          ) : (
            isOpen && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--skin-ink-faint)", padding: "40px 0" }}>
                <Loader2 size={16} className="animate-spin" />
                Loading…
              </div>
            )
          )}
        </div>
      </div>
    </>
  );
}
