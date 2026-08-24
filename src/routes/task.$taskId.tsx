import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/auth";
import { SidepanelProvider } from "@/contexts/sidepanel";
import { ItemSidepanel } from "@/components/sidepanel/ItemSidepanel";
import { FloatingAltitudeDial } from "@/components/altitude/FloatingAltitudeDial";
import { TaskDetailShell } from "@/components/task-detail/TaskDetailShell";
import { supabase } from "@/lib/supabase";
import {
  archiveNote,
  getTaskLabels,
  getUserDisplayName,
  patchNoteDetail,
  type TaskLabelObjective,
} from "@/lib/xcamp-api";
import { toggleNoteDone } from "@/lib/navigator-api";
import type { NoteRow } from "@/types/xcamp";

export const Route = createFileRoute("/task/$taskId")({
  head: () => ({
    meta: [{ title: "Task — Xcamp" }],
  }),
  component: TaskPage,
});

const TASK_COLUMNS =
  "id, title, body_html, body_markdown, body_text, note_type, tags, detail, tenant_id, owner_central_id, created_at, updated_at, done, start_date, end_date";

// ── Task page content ───────────────────────────────────────────────────────
// Data-fetching + mutation owner for the whole tabbed detail view. Full-depth
// (altitude=2 / Deep) layout only — this component doesn't gate anything on
// altitude; that dial still exists and is still mounted below, per the
// standing decision to defer per-altitude variation for the task modal.

export function TaskPageContent({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const { user, loading: authLoading } = useAuth();
  const qc = useQueryClient();

  const [noteRow, setNoteRow] = useState<NoteRow | null>(null);
  const [labels, setLabels] = useState<TaskLabelObjective[]>([]);
  const [ownerName, setOwnerName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  // Always-current detail snapshot so patchDetail merges never race a stale
  // read across tabs (e.g. an attachment added in one tab getting reverted by
  // a Do & Document autosave that started before the attachment save landed).
  const detailRef = useRef<Record<string, unknown>>({});

  useEffect(() => {
    if (!authLoading && !user) onClose();
  }, [authLoading, user, onClose]);

  const loadNote = useCallback(async () => {
    const { data, error: fetchErr } = await supabase
      .from("notes")
      .select(TASK_COLUMNS)
      .eq("id", taskId)
      .single();
    if (fetchErr || !data) return null;
    const raw = data as unknown as Record<string, unknown>;
    const row = { ...raw, created_by: raw.owner_central_id } as unknown as NoteRow;
    return row;
  }, [taskId]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError(null);
    loadNote()
      .then((row) => {
        if (!row) {
          setError("Could not load task.");
          setLoading(false);
          return;
        }
        if (row.note_type !== "task") {
          setError("This item is not a task.");
          setLoading(false);
          return;
        }
        detailRef.current = row.detail ?? {};
        setNoteRow(row);
        setLoading(false);
        void getTaskLabels(taskId).then(setLabels);
        void getUserDisplayName(row.created_by).then(setOwnerName);
      })
      .catch(() => {
        setError("Could not load task.");
        setLoading(false);
      });
  }, [taskId, user?.centralId, loadNote]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaved = useCallback(() => {
    void loadNote().then((row) => {
      if (row) {
        detailRef.current = row.detail ?? {};
        setNoteRow(row);
      }
    });
    void qc.invalidateQueries({ queryKey: ["notes"] });
    void qc.invalidateQueries({ queryKey: ["nav-tasks"] });
  }, [loadNote, qc]);

  const patchDetail = useCallback(
    async (patch: Record<string, unknown>) => {
      if (!user) return;
      await patchNoteDetail(user, taskId, detailRef.current, patch);
      detailRef.current = { ...detailRef.current, ...patch };
    },
    [user, taskId],
  );

  const handleRemove = async () => {
    if (!user || !noteRow) return;
    setRemoving(true);
    try {
      await archiveNote(user, noteRow);
      void qc.invalidateQueries({ queryKey: ["notes"] });
      onClose();
    } catch (e) {
      console.error("Remove task failed", e);
    } finally {
      setRemoving(false);
    }
  };

  const handleComplete = async () => {
    if (!noteRow) return;
    try {
      await toggleNoteDone(noteRow.id, !noteRow.done);
      setNoteRow({ ...noteRow, done: !noteRow.done });
      void qc.invalidateQueries({ queryKey: ["notes"] });
      void qc.invalidateQueries({ queryKey: ["nav-tasks"] });
    } catch (e) {
      console.error("Toggle complete failed", e);
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

  if (error || !noteRow || !user) {
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

  return (
    <>
      <TaskDetailShell
        noteRow={noteRow}
        labels={labels}
        ownerName={ownerName}
        user={user}
        onClose={onClose}
        onSaved={handleSaved}
        patchDetail={patchDetail}
        onRemove={() => void handleRemove()}
        onComplete={() => void handleComplete()}
        removing={removing}
      />
      <FloatingAltitudeDial />
      <ItemSidepanel />
    </>
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
