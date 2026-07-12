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
  'set_timeframe', 'manage_tags', 'create_project',
  'assign_to_note', 'add_project_member', 'navigate',
  'proof_note', 'reference_note', 'settle_objective', 'lock_value',
  'promote_to_agreement', 'accept_agreement',
  'initiate_completion', 'record_completion_decision',
  'objective_draft', 'update_project_description',
] as const;
export type AIWriteTool = (typeof AI_WRITE_TOOLS)[number];

// ─── Proposal payloads ────────────────────────────────────────────────────────

export type CollabRole = 'creator' | 'manager' | 'editor' | 'viewer';

export interface CreateTaskPayload {
  objective_id: string;
  title: string;
  body_markdown?: string;
  detail?: Record<string, unknown>;
}

export interface CompleteTaskPayload {
  task_note_id: string;
  done: boolean;
}

export interface AssignUserPayload {
  object_type: 'project' | 'objective' | 'note' | 'task';
  object_id: string;
  central_id?: string;
  email?: string;
  role: CollabRole;
  is_external?: boolean;
  message?: string;
}

export interface AddNotePayload {
  objective_id: string;
  title: string;
  body_markdown?: string;
  body_html?: string;
}

export interface AddAttachmentPayload {
  objective_id: string;
  url: string;
  title: string;
  mime_type?: string;
}

export interface SetObjectiveFieldsPayload {
  objective_id: string;
  title?: string;
  description?: string;
  dimension?: string;
  category?: string;
  detail?: Record<string, unknown>;
  requires_reconfirmation?: boolean;
}

export interface LinkNotesPayload {
  from_note_id: string;
  to_note_id: string;
  link_type?: string;
}

// ─── Phase B additions ────────────────────────────────────────────────────────

export interface SetTimeframePayload {
  objective_id: string;
  start_date?: string;
  end_date?: string;
}

export interface ManageTagsPayload {
  entity_type: 'objective' | 'note' | 'project';
  entity_id: string;
  tags_add?: string[];
  tags_remove?: string[];
}

export interface CreateProjectPayload {
  title: string;
  description?: string;
}

export interface AssignToNotePayload {
  note_id: string;
  user_id: string;
  role: CollabRole;
}

export interface AddProjectMemberPayload {
  project_id: string;
  user_id: string;
  role: CollabRole;
}

export interface NavigatePayload {
  url?: string;
  label?: string;
  objective_id?: string;
  note_id?: string;
  project_id?: string;
}

export interface ProofNotePayload {
  objective_id: string;
  title: string;
  body?: string;
}

export interface ReferenceNotePayload {
  objective_id: string;
  title: string;
  url?: string;
  body?: string;
}

export interface SettleObjectivePayload {
  objective_id: string;
}

export interface LockValuePayload {
  objective_id: string;
  value: number;
}

// ─── Phase 1 lifecycle payloads ───────────────────────────────────────────────

export interface PromoteToAgreementPayload {
  objective_id: string;
  contract_title: string;
  contract_text: string;
  idempotency_key: string;
}

export interface AcceptAgreementPayload {
  assignment_id: string;
}

export interface InitiateCompletionPayload {
  objective_id: string;
  deadline_hours?: number;
}

export interface RecordCompletionDecisionPayload {
  objective_id: string;
  decision: 'confirmed' | 'dissented';
  note?: string;
}

// ─── Client-synthesized payloads ──────────────────────────────────────────────

export interface ObjectiveDraftPayload {
  project_id: string;
  title: string;
  description?: string;
  dimension?: string;
  category?: string;
}

export interface UpdateProjectDescriptionPayload {
  project_id: string;
  description: string;
}

// ─── Proposal discriminated union ────────────────────────────────────────────

export interface AIProposalBase {
  id?: string;
}

export type AIProposal =
  | (AIProposalBase & { tool: 'create_task';                payload: CreateTaskPayload })
  | (AIProposalBase & { tool: 'complete_task';              payload: CompleteTaskPayload })
  | (AIProposalBase & { tool: 'assign_user';                payload: AssignUserPayload })
  | (AIProposalBase & { tool: 'add_note';                   payload: AddNotePayload })
  | (AIProposalBase & { tool: 'add_attachment';             payload: AddAttachmentPayload })
  | (AIProposalBase & { tool: 'set_objective_fields';       payload: SetObjectiveFieldsPayload })
  | (AIProposalBase & { tool: 'link_notes';                 payload: LinkNotesPayload })
  | (AIProposalBase & { tool: 'set_timeframe';              payload: SetTimeframePayload })
  | (AIProposalBase & { tool: 'manage_tags';                payload: ManageTagsPayload })
  | (AIProposalBase & { tool: 'create_project';             payload: CreateProjectPayload })
  | (AIProposalBase & { tool: 'assign_to_note';             payload: AssignToNotePayload })
  | (AIProposalBase & { tool: 'add_project_member';         payload: AddProjectMemberPayload })
  | (AIProposalBase & { tool: 'navigate';                   payload: NavigatePayload })
  | (AIProposalBase & { tool: 'proof_note';                 payload: ProofNotePayload })
  | (AIProposalBase & { tool: 'reference_note';             payload: ReferenceNotePayload })
  | (AIProposalBase & { tool: 'settle_objective';           payload: SettleObjectivePayload })
  | (AIProposalBase & { tool: 'lock_value';                 payload: LockValuePayload })
  | (AIProposalBase & { tool: 'promote_to_agreement';       payload: PromoteToAgreementPayload })
  | (AIProposalBase & { tool: 'accept_agreement';           payload: AcceptAgreementPayload })
  | (AIProposalBase & { tool: 'initiate_completion';        payload: InitiateCompletionPayload })
  | (AIProposalBase & { tool: 'record_completion_decision'; payload: RecordCompletionDecisionPayload })
  | (AIProposalBase & { tool: 'objective_draft';            payload: ObjectiveDraftPayload })
  | (AIProposalBase & { tool: 'update_project_description'; payload: UpdateProjectDescriptionPayload });

// ─── Card ─────────────────────────────────────────────────────────────────────

export interface AICardRef {
  label: string;
  url: string;
}

export interface AICard {
  id: string;
  parent_card_id?: string;
  kind: AICardKind;
  title: string;
  body?: string;
  proposal?: AIProposal;
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
  aiPersona?: AIPersona;
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
