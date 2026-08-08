import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useDebounce } from "@/hooks/useDebounce";
import {
  listProjects,
  listObjectives,
  syncObjectiveLinks,
  getNoteObjectiveIds,
  updateNote,
} from "@/lib/xcamp-api";
import { MultiSelectDropdown } from "@/components/ui/multi-select";
import { NoteEditor, type NoteEditorValues } from "@/components/editor/NoteEditor";
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

export function EntityPanel({ onClose, type, id, objectiveId, prefillText, initialTitle, user }: EntityPanelProps) {
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

  // ─── Legacy path (objectives, or notes/tasks without user) ───────────────
  return (
    <ObjectiveLegacyPanel
      onClose={onClose}
      type={type}
      id={id}
      objectiveId={objectiveId}
      prefillText={prefillText}
      initialTitle={initialTitle}
      user={user}
    />
  );
}

// Retained for objectives and fallback; notes/tasks with user use NoteEditor above.
function ObjectiveLegacyPanel({ onClose, type, id, objectiveId, prefillText, initialTitle, user }: EntityPanelProps) {
  const isNoteOrTask = type === 'note' || type === 'task';
  const showAssignment = isNoteOrTask && !!user && !objectiveId;

  const [title, setTitle] = useState(initialTitle ?? '');
  const [body, setBody] = useState('');
  const [fetchLoading, setFetchLoading] = useState(isNoteOrTask);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [savedContent, setSavedContent] = useState<{ title: string; body: string } | null>(null);

  const [assignedProjectId, setAssignedProjectId] = useState('');
  const [assignedObjectiveIds, setAssignedObjectiveIds] = useState<string[]>([]);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [objectives, setObjectives] = useState<Array<{ id: string; title: string }>>([]);
  const [noteDetail, setNoteDetail] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (!user) return;
    listProjects(user).then(setProjects).catch(console.error);
  }, [user?.centralId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user || !assignedProjectId) { setObjectives([]); return; }
    listObjectives(user, assignedProjectId).then(setObjectives).catch(console.error);
  }, [user?.centralId, assignedProjectId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isNoteOrTask || !id) {
      setBody(prefillText ?? '');
      setSavedContent({ title: initialTitle ?? '', body: prefillText ?? '' });
      setFetchLoading(false);
      return;
    }

    let cancelled = false;
    setFetchLoading(true);
    setSavedContent(null);

    const selectCols = showAssignment ? 'body_markdown, title, detail' : 'body_markdown, title';

    supabase
      .from('notes')
      .select(selectCols)
      .eq('id', id)
      .single()
      .then(async ({ data, error: fetchErr }) => {
        if (cancelled) return;

        if (fetchErr) {
          console.error('EntityPanel: failed to fetch existing note content', fetchErr);
          setBody(prefillText ?? '');
          setTitle(initialTitle ?? '');
          setSavedContent({ title: initialTitle ?? '', body: prefillText ?? '' });
        } else {
          const fetchedTitle = data?.title ?? initialTitle ?? '';
          const existing = (data as Record<string, unknown>)?.body_markdown as string ?? '';
          const appended = existing
            ? `${existing}\n\n---\n\n${prefillText ?? ''}`
            : (prefillText ?? '');

          setBody(appended);
          setTitle(fetchedTitle);
          setSavedContent({ title: fetchedTitle, body: appended });

          if (showAssignment && data) {
            const detail = ((data as Record<string, unknown>)?.detail ?? {}) as Record<string, unknown>;
            setNoteDetail(detail);
            if (typeof detail.project_id === 'string' && detail.project_id) {
              setAssignedProjectId(detail.project_id);
            }
            const existingObjIds = await getNoteObjectiveIds(id);
            if (!cancelled) setAssignedObjectiveIds(existingObjIds);
          }
        }

        setFetchLoading(false);
      });

    return () => { cancelled = true; };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const debouncedTitle = useDebounce(title, 1500);
  const debouncedBody = useDebounce(body, 1500);

  useEffect(() => {
    if (!isNoteOrTask || fetchLoading || savedContent === null) return;
    if (debouncedTitle === savedContent.title && debouncedBody === savedContent.body) return;

    const doSave = async () => {
      setSaving(true);
      setError(null);
      try {
        const bodyHtml = `<p>${debouncedBody.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>')}</p>`;

        if (objectiveId) {
          const { error: rpcError } = await supabase.rpc('upsert_objective_note', {
            p_objective_id: objectiveId,
            p_note_id: id,
            p_note_type: type,
            p_title: debouncedTitle || 'Untitled',
            p_body_markdown: debouncedBody,
            p_body_html: bodyHtml,
          });
          if (rpcError) throw rpcError;
        } else {
          const { error: updateError } = await supabase
            .from('notes')
            .update({
              title: debouncedTitle || 'Untitled',
              body_markdown: debouncedBody,
              body_html: bodyHtml,
              body_text: debouncedBody.replace(/\n/g, ' '),
              note_type: type,
              updated_at: new Date().toISOString(),
            })
            .eq('id', id);
          if (updateError) throw updateError;
        }

        setSavedContent({ title: debouncedTitle, body: debouncedBody });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Autosave failed');
      } finally {
        setSaving(false);
      }
    };

    doSave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedTitle, debouncedBody]);

  const handleManualSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const { error: rpcError } = await supabase.rpc('update_objective', {
        p_objective_id: id,
        p_title: title || undefined,
      });
      if (rpcError) throw rpcError;
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleProjectChange = async (newProjectId: string) => {
    setAssignedProjectId(newProjectId);
    setAssignedObjectiveIds([]);
    if (!id || !user) return;
    try {
      const updatedDetail = { ...noteDetail };
      if (newProjectId) updatedDetail.project_id = newProjectId;
      else delete updatedDetail.project_id;
      await supabase
        .from('notes')
        .update({ detail: updatedDetail as Record<string, unknown>, updated_at: new Date().toISOString() })
        .eq('id', id);
      setNoteDetail(updatedDetail);
      await syncObjectiveLinks(user, id, []);
    } catch (err) {
      console.error('EntityPanel: failed to update project assignment', err);
    }
  };

  const handleObjectivesChange = async (newIds: string[]) => {
    setAssignedObjectiveIds(newIds);
    if (!id || !user) return;
    try {
      await syncObjectiveLinks(user, id, newIds);
    } catch (err) {
      console.error('EntityPanel: failed to sync objective links', err);
    }
  };

  const typeLabel = type === 'task' ? 'Task' : type === 'note' ? 'Note' : 'Objective';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '20px 20px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--skin-ink-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {typeLabel} created
          </span>
          {isNoteOrTask && (
            <span style={{ fontSize: 12, color: saving ? 'var(--skin-ink-soft)' : 'var(--skin-accent)', opacity: saving || saved ? 1 : 0, transition: 'opacity 0.2s' }}>
              {saving ? 'Saving…' : 'Saved'}
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {fetchLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--skin-ink-soft)', fontSize: 13, padding: '24px 0' }}>
            <Loader2 size={16} className="animate-spin" /> Loading…
          </div>
        ) : (
          <>
            <input
              className="x-input"
              style={{ width: '100%', fontSize: 17, fontWeight: 600, padding: '8px 10px' }}
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            {isNoteOrTask && (
              <textarea
                className="x-input"
                style={{ width: '100%', minHeight: 200, padding: '10px 12px', fontSize: 14, lineHeight: 1.6, resize: 'vertical' }}
                placeholder="Content"
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            )}

            {showAssignment && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 4, borderTop: '1px solid var(--skin-line)' }}>
                <p style={{ fontSize: 12, color: 'var(--skin-ink-faint)', margin: 0, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Assign (optional)
                </p>
                <MultiSelectDropdown
                  label="Project"
                  placeholder="No project"
                  single
                  options={projects.map((p) => ({ value: p.id, label: p.name }))}
                  selected={assignedProjectId ? [assignedProjectId] : []}
                  onChange={(vals) => { void handleProjectChange(vals[0] ?? ''); }}
                />
                {assignedProjectId && (
                  <MultiSelectDropdown
                    label="Objectives (optional)"
                    placeholder="Select objectives…"
                    options={objectives.map((o) => ({ value: o.id, label: o.title }))}
                    selected={assignedObjectiveIds}
                    onChange={(vals) => { void handleObjectivesChange(vals); }}
                  />
                )}
              </div>
            )}

            {error && (
              <p style={{ fontSize: 13, color: 'var(--skin-danger, #d4524e)', margin: 0 }}>{error}</p>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '12px 20px', borderTop: '1px solid var(--skin-line)', display: 'flex', gap: 8, flexShrink: 0 }}>
        {!isNoteOrTask && (
          <button
            className="x-btn-primary"
            style={{ flex: 1 }}
            onClick={handleManualSave}
            disabled={saving || fetchLoading}
          >
            {saving ? (
              <><Loader2 size={14} className="animate-spin" style={{ display: 'inline', marginRight: 6 }} />Saving…</>
            ) : saved ? 'Saved ✓' : 'Save'}
          </button>
        )}
        <button
          className="x-btn-secondary"
          style={{ flex: isNoteOrTask ? 1 : undefined }}
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
}
