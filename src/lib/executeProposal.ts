import { supabase } from './supabase';
import type { AIProposal } from '../types/ai';

export interface ProposalResult {
  ok: boolean;
  entityId?: string;
  entityType?: 'note' | 'task' | 'objective';
  error?: string;
}

export async function executeProposal(
  proposal: AIProposal
): Promise<ProposalResult> {
  try {
    switch (proposal.tool) {
      case 'create_task': {
        const { data, error } = await supabase.rpc('upsert_objective_note', {
          p_objective_id: proposal.objective_id,
          p_note_type: 'task',
          p_title: proposal.payload.title,
          p_body_markdown: proposal.payload.body_markdown ?? '',
          p_body_html: proposal.payload.body_markdown
            ? `<p>${proposal.payload.body_markdown.replace(/\n/g, '<br/>')}</p>`
            : '',
        });
        if (error) throw error;
        const id = (data as Record<string, unknown> | null)?.id as string | undefined;
        return { ok: true, entityId: id, entityType: 'task' };
      }

      case 'add_note': {
        const { data, error } = await supabase.rpc('upsert_objective_note', {
          p_objective_id: proposal.objective_id,
          p_note_type: proposal.payload.note_type,
          p_title: proposal.payload.title,
          p_body_markdown: proposal.payload.body_markdown ?? '',
          p_body_html: proposal.payload.body_markdown
            ? `<p>${proposal.payload.body_markdown.replace(/\n/g, '<br/>')}</p>`
            : '',
        });
        if (error) throw error;
        const id = (data as Record<string, unknown> | null)?.id as string | undefined;
        return { ok: true, entityId: id, entityType: 'note' };
      }

      case 'set_objective_fields': {
        const p = proposal.payload;
        // p_detail carries fields not in the top-level signature
        const detail: Record<string, unknown> = {};
        if (p.definition_of_done !== undefined) detail.definition_of_done = p.definition_of_done;
        if (p.tags !== undefined) detail.tags = p.tags;
        if (p.start_date !== undefined) detail.start_date = p.start_date;
        if (p.end_date !== undefined) detail.end_date = p.end_date;

        const { error } = await supabase.rpc('update_objective', {
          p_objective_id: proposal.objective_id,
          p_title: p.title ?? undefined,
          // DB schema uses p_description; spec field is goal
          p_description: p.goal ?? undefined,
          p_dimension: p.dimension ?? undefined,
          p_category: p.category ?? undefined,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          p_detail: Object.keys(detail).length > 0 ? (detail as any) : undefined,
        });
        if (error) throw error;
        return { ok: true, entityId: proposal.objective_id, entityType: 'objective' };
      }

      default: {
        const exhaustive: never = proposal;
        return { ok: false, error: `Unknown proposal tool: ${JSON.stringify(exhaustive)}` };
      }
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
