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
    .select("id, tenant_id, display_name, email, preferences")
    .eq("id", authUserId)
    .single();

  if (error || !data) throw new Error("Central user not found for this account.");
  return data;
}

// Persist the user's display name on their central_users row.
export async function updateDisplayName(centralId: string, displayName: string) {
  const { error } = await supabase
    .from("central_users")
    .update({ display_name: displayName })
    .eq("id", centralId);
  if (error) throw new Error(error.message);
}

// Persist the avatar as an inline data URL inside central_users.preferences.
export async function updateAvatar(centralId: string, avatarUrl: string | null) {
  const { data: row, error: readError } = await supabase
    .from("central_users")
    .select("preferences")
    .eq("id", centralId)
    .single();
  if (readError) throw new Error(readError.message);
  const prefs =
    row?.preferences && typeof row.preferences === "object" && !Array.isArray(row.preferences)
      ? (row.preferences as Record<string, unknown>)
      : {};
  const nextPrefs = { ...prefs, avatar_url: avatarUrl ?? undefined };
  const { error } = await supabase
    .from("central_users")
    .update({ preferences: nextPrefs as Json })
    .eq("id", centralId);
  if (error) throw new Error(error.message);
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
    .in("note_type", NOTE_TYPES as unknown as string[])
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
  noteType?: string;
  objectiveIds?: string[];
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
      note_type: input.noteType ?? "note",
      done: false,
      tags: input.tags ?? [],
      detail: detail as Json,
      owner_central_id: user.centralId, // central_users.id — not authId
      tenant_id: user.tenantId,
    })
    .select(NOTE_COLUMNS)
    .single();

  if (error) throw error;
  const note = rowToNote(data);
  await syncObjectiveLinks(user, note.id, input.projectId ? input.objectiveIds ?? [] : []);
  return note;
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
      note_type: input.noteType ?? "note",
      tags: input.tags ?? [],
      detail: detail as Json,
      updated_at: new Date().toISOString(),
    })
    .eq("id", noteId)
    .eq("owner_central_id", user.centralId);

  if (error) throw error;
  await syncObjectiveLinks(user, noteId, input.projectId ? input.objectiveIds ?? [] : []);
}

// Replace the objective_notes links for a note with the provided objective ids.
async function syncObjectiveLinks(user: XcampUser, noteId: string, objectiveIds: string[]) {
  const { data: existing } = await supabase
    .from("objective_notes")
    .select("id, objective_id")
    .eq("note_id", noteId)
    .eq("owner_central_id", user.centralId);

  const current = new Set((existing ?? []).map((r) => r.objective_id as string));
  const next = new Set(objectiveIds);

  const toAdd = objectiveIds.filter((id) => !current.has(id));
  const toRemove = (existing ?? []).filter((r) => !next.has(r.objective_id as string));

  if (toRemove.length) {
    await supabase
      .from("objective_notes")
      .delete()
      .in(
        "id",
        toRemove.map((r) => r.id as string),
      );
  }
  if (toAdd.length) {
    await supabase.from("objective_notes").insert(
      toAdd.map((objective_id) => ({
        note_id: noteId,
        objective_id,
        owner_central_id: user.centralId,
        tenant_id: user.tenantId,
      })),
    );
  }
}

export async function listObjectives(
  user: XcampUser,
  projectId: string,
): Promise<{ id: string; title: string }[]> {
  if (!projectId) return [];
  const { data, error } = await supabase
    .from("objectives")
    .select("id, title")
    .eq("project_id", projectId)
    .eq("tenant_id", user.tenantId)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((o) => ({
    id: o.id as string,
    title: (o.title as string) || "Untitled objective",
  }));
}

export async function getNoteObjectiveIds(noteId: string): Promise<string[]> {
  const { data } = await supabase
    .from("objective_notes")
    .select("objective_id")
    .eq("note_id", noteId);
  return (data ?? []).map((r) => r.objective_id as string);
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
