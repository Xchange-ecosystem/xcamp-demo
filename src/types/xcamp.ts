// Xcamp Journal shared types — mirrors the Xcamp integration contract.

// The resolved user shape — build this after sign-in and cache it.
export interface XcampUser {
  authId: string; // auth.users.id — only for supabase.auth calls
  centralId: string; // central_users.id — used on all DB writes
  tenantId: string; // required on all DB inserts
  displayName: string;
  avatarUrl?: string;
  email?: string;
}

// An attachment stored inline in notes.detail.attachments.
export interface NoteAttachment {
  id: string;
  name: string;
  mime: string;
  size: number;
  dataUrl: string; // base64 data URL — kept inline (no storage bucket in this app)
}

// A note row as returned from the notes table.
export interface NoteRow {
  id: string;
  title: string;
  body_markdown: string | null;
  body_html: string | null;
  note_type: string; // always 'note' in Journal
  done: boolean;
  status: string | null; // 'inactive' | 'active' | 'completed' for note_type='task'; NULL otherwise
  tags: string[];
  detail: Record<string, unknown>;
  created_by: string; // central_users.id
  tenant_id: string;
  created_at: string;
  updated_at: string;
  start_date?: string | null;
  end_date?: string | null;
}

export interface ProjectRow {
  id: string;
  name: string;
}

export interface ProjectFull {
  id: string;
  name: string;
  feature_image: string | null;
  color: string | null;
  description: string | null;
  updated_at: string;
}

// Skin config shape stored in user_preferences.skin_config
export type Paradigm = "platform" | "companion" | "canvas";
export type Tone = "scientific" | "playful";
export type AIPersona = "analyst" | "guide" | "collaborator";

export interface SkinConfig {
  paradigm: Paradigm;
  tone: Tone;
  aiPersona: AIPersona;
}

// CollabRole — for future use when Journal shows linked objective context.
export type CollabRole = "creator" | "manager" | "editor" | "viewer";
