// ─── Primitives ───────────────────────────────────────────────────────────────

export type Altitude = 0 | 1 | 2;
export type AIPersona = 'analyst' | 'guide';
export type ContextScope = 'project' | 'organization' | 'tenant';

export const AI_CARD_KINDS = [
  'update', 'metric', 'opportunity', 'web_result',
  'urgency', 'celebration', 'content', 'action_item',
] as const;
export type AICardKind = (typeof AI_CARD_KINDS)[number];

export const AI_WRITE_TOOLS = [
  'create_task', 'complete_task', 'assign_user', 'add_note',
  'add_attachment', 'set_objective_fields', 'link_notes',
  'promote_to_agreement', 'accept_agreement',
  'initiate_completion', 'record_completion_decision',
] as const;
export type AIWriteTool = (typeof AI_WRITE_TOOLS)[number];

// ─── Proposal payloads ────────────────────────────────────────────────────────

export interface CreateTaskPayload {
  title: string;
  body_markdown?: string;
  start_date?: string;
  end_date?: string;
  assignee_central_ids?: string[];
}

export interface CompleteTaskPayload {
  task_note_id: string;
  done: boolean;
}

export type CollabRole = 'creator' | 'manager' | 'editor' | 'viewer';

export interface AssignUserPayload {
  scope: 'objective' | 'task';
  target_id: string;
  central_id?: string;
  email?: string;
  role: CollabRole;
}

export interface AddNotePayload {
  note_type: 'note' | 'proof' | 'reference';
  title: string;
  body_markdown?: string;
  link_to_task_note_id?: string;
}

export interface AddAttachmentPayload {
  entity_table: 'notes' | 'objectives';
  entity_id: string;
  attachment_id?: string;
  upload_ref?: string;
  label?: string;
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

export interface LinkNotesPayload {
  from_note_id: string;
  to_note_id: string;
  link_type: string;
}

// ─── Proposal discriminated union ────────────────────────────────────────────

export interface AIProposalBase {
  objective_id: string;
  rationale?: string;
  requires_reconfirmation?: boolean;
  preview?: { before?: unknown; after?: unknown };
}

export type AIProposal =
  | (AIProposalBase & { tool: 'create_task';          payload: CreateTaskPayload })
  | (AIProposalBase & { tool: 'complete_task';        payload: CompleteTaskPayload })
  | (AIProposalBase & { tool: 'assign_user';          payload: AssignUserPayload })
  | (AIProposalBase & { tool: 'add_note';             payload: AddNotePayload })
  | (AIProposalBase & { tool: 'add_attachment';       payload: AddAttachmentPayload })
  | (AIProposalBase & { tool: 'set_objective_fields'; payload: SetObjectiveFieldsPayload })
  | (AIProposalBase & { tool: 'link_notes';           payload: LinkNotesPayload });

// ─── Card ─────────────────────────────────────────────────────────────────────

export interface AICardRef {
  label: string;
  url: string;
}

export interface AICard {
  id: string;
  parent_card_id?: string;      // preserve from Vox — required for $parent rewrite in proposal runner
  kind: AICardKind;
  title: string;
  body?: string;                // markdown
  proposal?: AIProposal;        // present on 'action_item' cards only
  refs?: AICardRef[];
  dismissible: boolean;
  confirmable: boolean;
  requires_reconfirmation?: boolean;
}

// ─── Request / response contracts ────────────────────────────────────────────

export interface AttachmentInput {
  name: string;
  mime: string;
  url?: string;
  base64?: string;
}

export interface AnswerWithContextRequest {
  message: string;
  attachments?: AttachmentInput[];
  objective_id: string;
  project_id: string;
  tenant_id: string;
  altitude: Altitude;
  aiPersona?: AIPersona;        // camelCase — confirmed field name
  context_scope?: ContextScope;
  note_id?: string;
}

export interface AnswerWithContextResponse {
  ok?: boolean;
  reply_markdown: string;
  cards: AICard[];
  used_context?: {
    task_ids?: string[];
    note_ids?: string[];
    related_sources?: string[];
    focused_note_id?: string;
  };
  error?: string;
}

// ─── Proposal execution ───────────────────────────────────────────────────────

export interface ProposalResult {
  ok: boolean;
  committed_id?: string;
  error?: string;
}
