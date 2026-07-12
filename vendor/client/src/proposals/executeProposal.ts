import type { AIProposal, ProposalResult } from '../types/ai';
import type { TokenProvider } from '../vox/client';
import { getSupabaseClient } from '../supabase/client';
import { checkToolAuth } from '../types/toolAuth';

function extractError(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const v = value as Record<string, unknown>;
    if (typeof v['message'] === 'string') return v['message'];
    return JSON.stringify(value);
  }
  return String(value);
}

export async function executeProposal(
  proposal: AIProposal,
  getToken: TokenProvider,
  backendUrl: string,
): Promise<ProposalResult> {
  // Auth gate: HARD_GATE and NOT_EXECUTABLE tools are rejected before any network call.
  const authCheck = checkToolAuth(proposal.tool);
  if (!authCheck.permitted) {
    return { ok: false, error: authCheck.reason };
  }

  try {
    const token = await getToken();
    if (!token) return { ok: false, error: 'No auth token available' };

    // Try the backend route first.
    if (backendUrl) {
      try {
        const res = await fetch(`${backendUrl.replace(/\/$/, '')}/api/proposals/execute`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            tool: proposal.tool,
            payload: proposal.payload,
          }),
        });

        if (res.ok) {
          const body = await res.json() as ProposalResult & { error?: unknown };
          console.log('[executeProposal] backend response:', body);
          // Normalise error field — backend may return an object instead of a string.
          if (!body.ok && body.error !== undefined) {
            return { ok: false, error: extractError(body.error) };
          }
          return body;
        }

        // Fall through to Supabase fallback only when route is not yet wired (404).
        if (res.status !== 404) {
          const text = await res.text().catch(() => '');
          console.log('[executeProposal] backend HTTP error', res.status, text);
          return { ok: false, error: `Backend error ${res.status}: ${text}` };
        }
      } catch (netErr) {
        // Network error reaching backend — fall through to Supabase fallback.
        console.log('[executeProposal] network error reaching backend:', netErr);
      }
    }

    // TODO: Move to backend route once /api/proposals/execute is implemented.
    const supabase = getSupabaseClient();

    switch (proposal.tool) {
      case 'create_task': {
        const p = proposal.payload;
        const { data, error } = await supabase.rpc('upsert_objective_note', {
          p_objective_id:  p.objective_id,
          p_note_id:       null,
          p_note_type:     'task',
          p_title:         p.title,
          p_body_html:     '',
          p_body_markdown: p.body_markdown ?? '',
          p_detail:        p.detail ?? {},
        });
        console.log('[executeProposal] supabase create_task:', { data, error });
        if (error) return { ok: false, error: error.message };
        return { ok: true, committed_id: extractNoteId(data) };
      }
      case 'add_note': {
        const p = proposal.payload;
        const { data, error } = await supabase.rpc('upsert_objective_note', {
          p_objective_id:  p.objective_id,
          p_note_id:       null,
          p_note_type:     'note',
          p_title:         p.title,
          p_body_html:     p.body_html ?? '',
          p_body_markdown: p.body_markdown ?? '',
          p_detail:        {},
        });
        console.log('[executeProposal] supabase add_note:', { data, error });
        if (error) return { ok: false, error: error.message };
        return { ok: true, committed_id: extractNoteId(data) };
      }
      default:
        return { ok: false, error: `Tool '${proposal.tool}' requires backend route — not yet wired` };
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// upsert_objective_note can return a bare id string, a NoteRow object, or an array.
function extractNoteId(data: unknown): string | undefined {
  if (typeof data === 'string') return data;
  if (Array.isArray(data) && data[0]) return (data[0] as { id?: string }).id;
  if (data && typeof data === 'object') return (data as { id?: string }).id;
  return undefined;
}
