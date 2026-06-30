export type ContextScope = 'project' | 'organization' | 'tenant';

export type AICardKind =
  | 'update' | 'metric' | 'opportunity' | 'web_result'
  | 'urgency' | 'celebration' | 'content' | 'action_item';

export const AI_WRITE_TOOLS = [
  'create_task', 'complete_task', 'assign_user', 'add_note',
  'add_attachment', 'set_objective_fields', 'link_notes',
] as const;
export type AIWriteTool = (typeof AI_WRITE_TOOLS)[number];

export interface CreateTaskPayload {
  title: string;
  body_markdown?: string;
  start_date?: string;
  end_date?: string;
  assignee_central_ids?: string[];
}

export interface AddNotePayload {
  note_type: 'note' | 'proof' | 'reference';
  title: string;
  body_markdown?: string;
  link_to_task_note_id?: string;
}

export interface SetObjectiveFieldsPayload {
  title?: string;
  goal?: string;
  definition_of_done?: string;
  start_date?: string;
  end_date?: string;
  dimension?: string;
  category?: string;
  tags?: string[];
}

export interface AIProposalBase {
  objective_id: string;
  rationale?: string;
  requires_reconfirmation?: boolean;
  preview?: { before?: unknown; after?: unknown };
}

export type AIProposal =
  | (AIProposalBase & { tool: 'create_task'; payload: CreateTaskPayload })
  | (AIProposalBase & { tool: 'add_note'; payload: AddNotePayload })
  | (AIProposalBase & { tool: 'set_objective_fields'; payload: SetObjectiveFieldsPayload });

export interface AICardRef {
  label: string;
  url: string;
}

export interface AICard {
  id: string;
  kind: AICardKind;
  title: string;
  body?: string;
  proposal?: AIProposal;
  refs?: AICardRef[];
  dismissible: boolean;
  confirmable: boolean;
}

export interface AnswerWithContextRequest {
  message: string;
  objective_id?: string;
  project_id: string;
  tenant_id: string;
  altitude: 0 | 1 | 2;
  context_scope?: ContextScope;
}

export interface AnswerWithContextResponse {
  ok: boolean;
  reply_markdown?: string;
  cards: AICard[];
  used_context?: {
    task_ids?: string[];
    note_ids?: string[];
    related_sources?: string[];
  };
  error?: string;
}
