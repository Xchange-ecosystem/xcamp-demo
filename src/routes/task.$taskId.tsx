import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/auth";
import { SidepanelProvider, useSidepanel } from "@/contexts/sidepanel";
import { ItemSidepanel } from "@/components/sidepanel/ItemSidepanel";
import { NoteEditor, type NoteEditorValues } from "@/components/editor/NoteEditor";
import { FloatingAltitudeDial } from "@/components/altitude/FloatingAltitudeDial";
import { useAltitudeStore } from "@/store/altitudeStore";
import { supabase } from "@/lib/supabase";
import { listProjects, updateNote, archiveNote } from "@/lib/xcamp-api";
import { fetchLinkedItemsForNote } from "@/lib/sidepanel-service";
import type { NoteRow } from "@/types/xcamp";

export const Route = createFileRoute("/task/$taskId")({
  head: () => ({
    meta: [{ title: "Task — Xcamp" }],
  }),
  component: TaskPage,
});

// ── Linked objectives panel ─────────────────────────────────────────────────

function LinkedObjectivesPanel({ taskId }: { taskId: string }) {
  const { push } = useSidepanel();

  const { data: linked = [], isLoading } = useQuery({
    queryKey: ["linked-items", taskId, "note"],
    queryFn: () => fetchLinkedItemsForNote(taskId),
  });

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: "var(--skin-ink-faint)",
          padding: "24px 0",
        }}
      >
        <Loader2 size={14} className="animate-spin" />
        Loading…
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <p
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "var(--skin-ink-faint)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          margin: "0 0 4px",
        }}
      >
        Linked objectives
      </p>
      {linked.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--skin-ink-faint)", margin: 0 }}>
          No linked objectives.
        </p>
      ) : (
        linked.map((item) => (
          <button
            key={item.id}
            onClick={() => push({ id: item.id, kind: item.kind, title: item.title })}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid var(--skin-line)",
              background: "var(--skin-surface2)",
              cursor: "pointer",
              textAlign: "left",
              width: "100%",
            }}
          >
            <span
              style={{
                fontSize: 13,
                color: "var(--skin-ink)",
                flex: 1,
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {item.title}
            </span>
            {item.status && (
              <span
                style={{ fontSize: 11, color: "var(--skin-ink-faint)", flexShrink: 0 }}
              >
                {item.status}
              </span>
            )}
          </button>
        ))
      )}
    </div>
  );
}

// ── Task page content ───────────────────────────────────────────────────────

export function TaskPageContent({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const { user, loading: authLoading } = useAuth();
  const qc = useQueryClient();
  const { altitude } = useAltitudeStore();

  const [noteRow, setNoteRow] = useState<NoteRow | null>(null);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) onClose();
  }, [authLoading, user, onClose]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError(null);
    Promise.all([
      supabase
        .from("notes")
        .select(
          "id, title, body_html, body_markdown, note_type, tags, detail, tenant_id, owner_central_id, created_at, updated_at, done",
        )
        .eq("id", taskId)
        .single(),
      listProjects(user),
    ])
      .then(([{ data, error: fetchErr }, projs]) => {
        if (fetchErr || !data) {
          setError("Could not load task.");
          setLoading(false);
          return;
        }
        const raw = data as unknown as Record<string, unknown>;
        const row = { ...raw, created_by: raw.owner_central_id } as unknown as NoteRow;
        if (row.note_type !== "task") {
          setError("This item is not a task.");
          setLoading(false);
          return;
        }
        setNoteRow(row);
        setProjects(projs);
        setLoading(false);
      })
      .catch(() => {
        setError("Could not load task.");
        setLoading(false);
      });
  }, [taskId, user?.centralId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async (v: NoteEditorValues) => {
    if (!user || !noteRow) return;
    setSaving(true);
    try {
      await updateNote(user, taskId, {
        ...v,
        existingDetail: (noteRow.detail as Record<string, unknown>) ?? {},
      });
      void qc.invalidateQueries({ queryKey: ["notes"] });
      void qc.invalidateQueries({ queryKey: ["nav-tasks"] });
    } catch (e) {
      console.error("Task save failed", e);
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!user || !noteRow) return;
    setArchiving(true);
    try {
      await archiveNote(user, noteRow);
      void qc.invalidateQueries({ queryKey: ["notes"] });
      onClose();
    } catch (e) {
      console.error("Archive failed", e);
    } finally {
      setArchiving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "var(--skin-surface)",
        }}
      >
        <Loader2 size={24} className="animate-spin" style={{ color: "var(--skin-accent)" }} />
      </div>
    );
  }

  if (error || !noteRow) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "var(--skin-surface)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "var(--skin-ink-soft)", marginBottom: 12 }}>
            {error ?? "Task not found."}
          </p>
          <button className="x-btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    );
  }

  // Altitude 0 = Surface: editor only, no linked panel
  // Altitude 1 = Working: two-column, editor + linked objectives
  // Altitude 2 = Deep: two-column, editor + linked objectives + meta strip
  const showLinkedPanel = altitude >= 1;
  const expandedMeta = altitude === 2;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--skin-surface)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top bar */}
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
        <span style={{ fontSize: 12, color: "var(--skin-ink-faint)" }}>·</span>
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "var(--skin-ink)",
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {noteRow.title || "Untitled task"}
        </span>
      </div>

      {/* Main content — altitude-branched layout */}
      <div
        style={{
          flex: 1,
          display: showLinkedPanel ? "grid" : "block",
          gridTemplateColumns: showLinkedPanel ? "1fr 320px" : undefined,
          overflow: "hidden",
          minHeight: 0,
        }}
      >
        {/* Editor */}
        <div style={{ overflowY: "auto", padding: "24px 32px" }}>
          <NoteEditor
            key={noteRow.id}
            editing={{ mode: "edit", note: noteRow }}
            projects={projects}
            user={user!}
            saving={saving}
            archiving={archiving}
            onSave={handleSave}
            onCancel={onClose}
            onArchive={handleArchive}
          />
        </div>

        {/* Linked objectives panel (altitude 1+) */}
        {showLinkedPanel && (
          <div
            style={{
              borderLeft: "1px solid var(--skin-line)",
              overflowY: "auto",
              padding: 20,
              background: expandedMeta ? "var(--skin-surface2)" : "var(--skin-surface)",
            }}
          >
            <LinkedObjectivesPanel taskId={taskId} />

            {/* Deep altitude (2): meta strip */}
            {expandedMeta && (
              <div
                style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 8 }}
              >
                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--skin-ink-faint)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    margin: "0 0 4px",
                  }}
                >
                  Task detail
                </p>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--skin-ink-soft)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  <div>
                    <span style={{ color: "var(--skin-ink-faint)" }}>Created: </span>
                    {new Date(noteRow.created_at).toLocaleString()}
                  </div>
                  <div>
                    <span style={{ color: "var(--skin-ink-faint)" }}>Updated: </span>
                    {new Date(noteRow.updated_at || noteRow.created_at).toLocaleString()}
                  </div>
                  <div>
                    <span style={{ color: "var(--skin-ink-faint)" }}>Type: </span>
                    {noteRow.note_type}
                  </div>
                  {noteRow.tags?.length > 0 && (
                    <div
                      style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}
                    >
                      {noteRow.tags.map((t) => (
                        <span key={t} className="x-tag x-tag--sm">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <FloatingAltitudeDial />
      <ItemSidepanel />
    </div>
  );
}

// ── Route component ─────────────────────────────────────────────────────────

function TaskPage() {
  const { taskId } = Route.useParams();
  return (
    <SidepanelProvider>
      <TaskPageContent taskId={taskId} onClose={() => window.close()} />
    </SidepanelProvider>
  );
}
