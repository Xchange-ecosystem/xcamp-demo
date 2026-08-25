import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { listProjects, updateNote } from "@/lib/xcamp-api";
import { NoteEditor, type NoteEditorValues } from "@/components/editor/NoteEditor";
import { ObjectiveContent } from "@/components/sidepanel/ItemSidepanel";
import { useActiveProject } from "@/contexts/active-project";
import type { NoteRow, ProjectRow, XcampUser } from "@/types/xcamp";

export interface EntityPanelProps {
  onClose: () => void;
  type: 'note' | 'task' | 'objective';
  id: string;
  objectiveId?: string;
  prefillText?: string;
  initialTitle?: string;
  /** Provide to enable post-creation project/objective assignment on standalone notes */
  user?: XcampUser;
}

export function EntityPanel({ onClose, type, id, prefillText, user }: EntityPanelProps) {
  const isNoteOrTask = type === 'note' || type === 'task';
  const useRichEditor = isNoteOrTask && !!user;

  // ─── Rich editor path (notes + tasks with user) ───────────────────────────
  const { activeProjectId } = useActiveProject();
  const [noteRow, setNoteRow] = useState<NoteRow | null>(null);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!useRichEditor || !id) return;
    let cancelled = false;
    setFetchLoading(true);
    setNoteRow(null);

    Promise.all([
      supabase
        .from('notes')
        .select('id, title, body_html, note_type, tags, detail, tenant_id, owner_central_id, created_at, updated_at')
        .eq('id', id)
        .single(),
      listProjects(user!),
    ]).then(([{ data }, projs]) => {
      if (cancelled) return;
      if (data) {
        const raw = data as unknown as Record<string, unknown>;
        const row = { ...raw, created_by: raw.owner_central_id } as unknown as NoteRow;
        // Append prefillText to existing body with a separator so existing content is preserved
        const existingBody = row.body_html || '';
        const safeText = prefillText
          ? prefillText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
          : '';
        const effectiveBodyHtml = existingBody
          ? (safeText ? `${existingBody}\n\n---\n\n<p>${safeText}</p>` : existingBody)
          : (safeText ? `<p>${safeText}</p>` : '');
        const existingProjectId = (row.detail as Record<string, unknown>)?.project_id as string | undefined;
        const effectiveDetail = {
          ...((row.detail as Record<string, unknown>) ?? {}),
          project_id: existingProjectId || activeProjectId || undefined,
        };
        setNoteRow({ ...row, body_html: effectiveBodyHtml, detail: effectiveDetail });
      }
      setProjects(projs);
      setFetchLoading(false);
    }).catch(() => { if (!cancelled) setFetchLoading(false); });

    return () => { cancelled = true; };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async (v: NoteEditorValues) => {
    if (!user || !noteRow) return;
    setSaving(true);
    try {
      await updateNote(user, id, { ...v, existingDetail: (noteRow.detail as Record<string, unknown>) ?? {} });
    } catch (err) {
      console.error('EntityPanel: save failed', err);
    } finally {
      setSaving(false);
    }
  };

  if (useRichEditor) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
        {fetchLoading || !noteRow ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '40px 20px', color: 'var(--skin-ink-soft)', fontSize: 13, minHeight: 120 }}>
            <Loader2 size={16} className="animate-spin" /> Loading…
          </div>
        ) : (
          <div style={{ padding: '20px' }}>
            <NoteEditor
              editing={{ mode: "edit", note: noteRow }}
              projects={projects}
              user={user!}
              saving={saving}
              archiving={false}
              onSave={handleSave}
              onCancel={onClose}
            />
          </div>
        )}
      </div>
    );
  }

  // ─── Objective path — same rich editor everyone else gets ─────────────────
  if (type === 'objective') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          <ObjectiveContent itemId={id} />
        </div>
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--skin-line)', flexShrink: 0 }}>
          <button className="x-btn-secondary" style={{ width: '100%' }} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    );
  }

  // Notes/tasks without a signed-in user aren't supported — the rich editor requires one.
  return null;
}
