export interface CompanionContext {
  tenantId: string;
  projectId?: string;
  objectiveId?: string;
  noteId?: string;
}

export interface ProjectSummary {
  id: string;
  title: string;
  description?: string;
  status?: string;
}

export interface ObjectiveSummary {
  id: string;
  title: string;
  description?: string;
  status: string;
  dimension?: string;
  category?: string;
}

export interface NoteSummary {
  id: string;
  title: string;
  note_type: string;
  done?: boolean;
}
