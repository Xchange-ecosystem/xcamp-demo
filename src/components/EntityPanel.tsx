import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { supabase } from "@/lib/supabase";
import { useDebounce } from "@/hooks/useDebounce";

export interface EntityPanelProps {
  open: boolean;
  onClose: () => void;
  type: 'note' | 'task' | 'objective';
  id: string;
  objectiveId?: string;
  prefillText?: string;
  initialTitle?: string;
}

export function EntityPanel({ open, onClose, type, id, objectiveId, prefillText, initialTitle }: EntityPanelProps) {
  const isNoteOrTask = type === 'note' || type === 'task';

  const [title, setTitle] = useState(initialTitle ?? '');
  const [body, setBody] = useState('');
  const [fetchLoading, setFetchLoading] = useState(isNoteOrTask);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tracks the last content successfully saved (or fetched from DB).
  // Autosave fires only when debounced values diverge from this — prevents
  // spurious saves on mount when debounced values settle to their initial state.
  const [savedContent, setSavedContent] = useState<{ title: string; body: string } | null>(null);

  // Fetch existing note/task from the 'notes' table (confirmed table name via
  // pg_get_functiondef on upsert_objective_note) then append prefillText to it.
  // Objectives don't need this — set_objective_fields semantically sets fields,
  // not prose; manual Save button handles them.
  useEffect(() => {
    if (!isNoteOrTask || !id) {
      setBody(prefillText ?? '');
      setSavedContent({ title: initialTitle ?? '', body: prefillText ?? '' });
      setFetchLoading(false);
      return;
    }

    let cancelled = false;
    setFetchLoading(true);
    setSavedContent(null); // prevent autosave firing on stale content during fetch

    supabase
      .from('notes')
      .select('body_markdown, title')
      .eq('id', id)
      .single()
      .then(({ data, error: fetchErr }) => {
        if (cancelled) return;

        if (fetchErr) {
          console.error('EntityPanel: failed to fetch existing note content', fetchErr);
          // Fall back to prefillText only — still functional
          setBody(prefillText ?? '');
          setTitle(initialTitle ?? '');
          setSavedContent({ title: initialTitle ?? '', body: prefillText ?? '' });
        } else {
          const fetchedTitle = data?.title ?? initialTitle ?? '';
          const existing = data?.body_markdown ?? '';
          // Append AI-augmented text to existing content, separated by a divider.
          // If the note was just created (empty body), use prefillText directly.
          const appended = existing
            ? `${existing}\n\n---\n\n${prefillText ?? ''}`
            : (prefillText ?? '');

          setBody(appended);
          setTitle(fetchedTitle);
          setSavedContent({ title: fetchedTitle, body: appended });
        }

        setFetchLoading(false);
      });

    return () => { cancelled = true; };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // 1500ms debounce — mirrors the NoteEditor autosave delay from Session 3.
  const debouncedTitle = useDebounce(title, 1500);
  const debouncedBody = useDebounce(body, 1500);

  // Autosave for note/task — only when debounced values differ from last-saved content.
  useEffect(() => {
    if (!isNoteOrTask || fetchLoading || savedContent === null) return;
    if (debouncedTitle === savedContent.title && debouncedBody === savedContent.body) return;

    const doSave = async () => {
      setSaving(true);
      setError(null);
      try {
        const bodyHtml = `<p>${debouncedBody.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>')}</p>`;
        const { error: rpcError } = await supabase.rpc('upsert_objective_note', {
          p_objective_id: objectiveId ?? '',
          p_note_id: id,
          p_note_type: type,
          p_title: debouncedTitle || 'Untitled',
          p_body_markdown: debouncedBody,
          p_body_html: bodyHtml,
        });
        if (rpcError) throw rpcError;
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

  // Manual save — objectives only.
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

  const typeLabel = type === 'task' ? 'Task' : type === 'note' ? 'Note' : 'Objective';

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        style={{ width: 400, maxWidth: '95vw', display: 'flex', flexDirection: 'column', gap: 0, padding: 0 }}
      >
        <SheetHeader style={{ padding: '20px 20px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <SheetTitle style={{ fontSize: 14, fontWeight: 600, color: 'var(--skin-ink-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {typeLabel} created
            </SheetTitle>
            {isNoteOrTask && (
              <span style={{ fontSize: 12, color: saving ? 'var(--skin-ink-soft)' : 'var(--skin-accent)', opacity: saving || saved ? 1 : 0, transition: 'opacity 0.2s' }}>
                {saving ? 'Saving…' : 'Saved'}
              </span>
            )}
          </div>
        </SheetHeader>

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

              {error && (
                <p style={{ fontSize: 13, color: 'var(--skin-danger, #d4524e)', margin: 0 }}>{error}</p>
              )}
            </>
          )}
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--skin-line)', display: 'flex', gap: 8 }}>
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
      </SheetContent>
    </Sheet>
  );
}
