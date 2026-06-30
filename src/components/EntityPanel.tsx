import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { supabase } from "@/lib/supabase";

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
  const [title, setTitle] = useState(initialTitle ?? '');
  const [body, setBody] = useState(prefillText ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (type === 'note' || type === 'task') {
        const bodyHtml = `<p>${body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>')}</p>`;
        const { error: rpcError } = await supabase.rpc('upsert_objective_note', {
          p_objective_id: objectiveId ?? '',
          p_note_id: id,
          p_note_type: type,
          p_title: title || 'Untitled',
          p_body_markdown: body || '',
          p_body_html: bodyHtml || '',
        });
        if (rpcError) throw rpcError;
      } else {
        const { error: rpcError } = await supabase.rpc('update_objective', {
          p_objective_id: id,
          p_title: title || undefined,
        });
        if (rpcError) throw rpcError;
      }
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
          <SheetTitle style={{ fontSize: 14, fontWeight: 600, color: 'var(--skin-ink-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {typeLabel} created
          </SheetTitle>
        </SheetHeader>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            className="x-input"
            style={{ width: '100%', fontSize: 17, fontWeight: 600, padding: '8px 10px' }}
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          {(type === 'note' || type === 'task') && (
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
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--skin-line)', display: 'flex', gap: 8 }}>
          <button
            className="x-btn-primary"
            style={{ flex: 1 }}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <><Loader2 size={14} className="animate-spin" style={{ display: 'inline', marginRight: 6 }} />Saving…</>
            ) : saved ? 'Saved ✓' : 'Save'}
          </button>
          <button className="x-btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
