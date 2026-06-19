// Xcamp Journal data access — direct Supabase table access only.
// No RPCs. Journal only writes `notes` with note_type='note'.
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { NoteAttachment, NoteRow, ProjectRow, XcampUser } from "@/types/xcamp";

const NOTE_COLUMNS =
  "id, title, body_markdown, body_html, note_type, done, tags, detail, owner_central_id, tenant_id, created_at, updated_at";

// Allowed note types selectable in the editor.
export const NOTE_TYPES = [
  "note",
  "task",
  "idea",
  "question",
  "decision",
  "reference",
] as const;
export type NoteType = (typeof NOTE_TYPES)[number];

// In this schema central_users.id is the auth user id; tenant comes from the row.
export async function resolveCentralUser(authUserId: string) {
  const { data, error } = await supabase
    .from("central_users")
    .select("id, tenant_id, display_name, email")
    .eq("id", authUserId)
    .single();

  if (error || !data) throw new Error("Central user not found for this account.");
  return data;
}

function rowToNote(r: Record<string, unknown>): NoteRow {
  return {
    id: r.id as string,
    title: (r.title as string) ?? "",
    body_markdown: (r.body_markdown as string) ?? null,
    body_html: (r.body_html as string) ?? null,
    note_type: r.note_type as string,
    done: !!r.done,
    tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
    detail: (r.detail as Record<string, unknown>) ?? {},
    created_by: r.owner_central_id as string,
    tenant_id: r.tenant_id as string,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  };
}

// Strip HTML tags to keep body_text/markdown roughly searchable.
function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function listNotes(user: XcampUser): Promise<NoteRow[]> {
  const { data, error } = await supabase
    .from("notes")
    .select(NOTE_COLUMNS)
    .eq("owner_central_id", user.centralId)
    .eq("note_type", "note")
    .eq("tenant_id", user.tenantId)
    .or("detail->>archived.is.null,detail->>archived.eq.false")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(rowToNote);
}

interface NoteInput {
  title: string;
  bodyHtml: string;
  projectId?: string | null;
  tags?: string[];
  attachments?: NoteAttachment[];
}

export async function createNote(user: XcampUser, input: NoteInput): Promise<NoteRow> {
  const detail: Record<string, unknown> = {};
  if (input.projectId) detail.project_id = input.projectId;
  if (input.attachments && input.attachments.length) detail.attachments = input.attachments;

  const { data, error } = await supabase
    .from("notes")
    .insert({
      title: input.title,
      body_markdown: input.bodyHtml,
      body_html: input.bodyHtml,
      body_text: htmlToText(input.bodyHtml),
      note_type: "note", // ALWAYS 'note'
      done: false,
      tags: input.tags ?? [],
      detail: detail as Json,
      owner_central_id: user.centralId, // central_users.id — not authId
      tenant_id: user.tenantId,
    })
    .select(NOTE_COLUMNS)
    .single();

  if (error) throw error;
  return rowToNote(data);
}

export async function updateNote(
  user: XcampUser,
  noteId: string,
  input: NoteInput & { existingDetail: Record<string, unknown> },
): Promise<void> {
  const detail = { ...input.existingDetail };
  if (input.projectId) detail.project_id = input.projectId;
  else delete detail.project_id;
  if (input.attachments && input.attachments.length) detail.attachments = input.attachments;
  else delete detail.attachments;

  const { error } = await supabase
    .from("notes")
    .update({
      title: input.title,
      body_markdown: input.bodyHtml,
      body_html: input.bodyHtml,
      body_text: htmlToText(input.bodyHtml),
      tags: input.tags ?? [],
      detail: detail as Json,
      updated_at: new Date().toISOString(),
    })
    .eq("id", noteId)
    .eq("owner_central_id", user.centralId);

  if (error) throw error;
}

export async function archiveNote(user: XcampUser, note: NoteRow): Promise<void> {
  const { error } = await supabase
    .from("notes")
    .update({
      detail: { ...note.detail, archived: true } as Json,
      updated_at: new Date().toISOString(),
    })
    .eq("id", note.id)
    .eq("owner_central_id", user.centralId);

  if (error) throw error;
}

export async function bulkArchive(user: XcampUser, notes: NoteRow[]): Promise<void> {
  await Promise.all(notes.map((note) => archiveNote(user, note)));
}

export async function bulkAssignProject(
  user: XcampUser,
  notes: NoteRow[],
  projectId: string | null,
): Promise<void> {
  await Promise.all(
    notes.map((note) => {
      const detail = { ...note.detail };
      if (projectId) detail.project_id = projectId;
      else delete detail.project_id;
      return supabase
        .from("notes")
        .update({ detail: detail as Json, updated_at: new Date().toISOString() })
        .eq("id", note.id)
        .eq("owner_central_id", user.centralId);
    }),
  );
}

export async function listProjects(user: XcampUser): Promise<ProjectRow[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("id, title")
    .eq("tenant_id", user.tenantId)
    .order("title");

  if (error) throw error;
  return (data ?? []).map((p) => ({ id: p.id as string, name: (p.title as string) ?? "Untitled" }));
}

export async function getLinkedNoteIds(noteIds: string[]): Promise<Set<string>> {
  if (noteIds.length === 0) return new Set();
  const { data } = await supabase
    .from("objective_notes")
    .select("note_id")
    .in("note_id", noteIds);
  return new Set((data ?? []).map((r) => r.note_id as string));
}
