// Xcamp Journal data access — direct Supabase table access only.
// No RPCs. Journal only writes `notes` with note_type='note'.
import { supabase } from "@/integrations/supabase/client";
import type { NoteRow, ProjectRow, XcampUser } from "@/types/xcamp";

// Minimal markdown -> HTML so body_html stays populated alongside body_markdown.
export function markdownToHtml(md: string): string {
  const escape = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  return escape(md)
    .replace(/^### (.*)$/gm, "<h3>$1</h3>")
    .replace(/^## (.*)$/gm, "<h2>$1</h2>")
    .replace(/^# (.*)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+?)`/g, "<code>$1</code>")
    .split(/\n{2,}/)
    .map((block) => `<p>${block.replace(/\n/g, "<br/>")}</p>`)
    .join("");
}

export async function resolveCentralUser(authUserId: string) {
  const { data, error } = await supabase
    .from("central_users")
    .select("id, tenant_id, display_name, avatar_url, email")
    .eq("auth_user_id", authUserId)
    .single();

  if (error || !data) throw new Error("Central user not found for this account.");
  return data as {
    id: string;
    tenant_id: string;
    display_name: string;
    avatar_url: string | null;
    email: string | null;
  };
}

export async function listNotes(user: XcampUser): Promise<NoteRow[]> {
  const { data, error } = await supabase
    .from("notes")
    .select("id, title, body_markdown, body_html, note_type, done, detail, created_by, tenant_id, created_at, updated_at")
    .eq("created_by", user.centralId)
    .eq("note_type", "note")
    .eq("tenant_id", user.tenantId)
    .not("detail->archived", "eq", true)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as NoteRow[];
}

export async function createNote(
  user: XcampUser,
  input: { title: string; bodyMarkdown: string; projectId?: string | null },
): Promise<NoteRow> {
  const detail: Record<string, unknown> = {};
  if (input.projectId) detail.project_id = input.projectId;

  const { data, error } = await supabase
    .from("notes")
    .insert({
      title: input.title,
      body_markdown: input.bodyMarkdown,
      body_html: markdownToHtml(input.bodyMarkdown),
      note_type: "note", // ALWAYS 'note'
      done: false,
      detail,
      created_by: user.centralId, // central_users.id — not authId
      tenant_id: user.tenantId,
    })
    .select("id, title, body_markdown, body_html, note_type, done, detail, created_by, tenant_id, created_at, updated_at")
    .single();

  if (error) throw error;
  return data as NoteRow;
}

export async function updateNote(
  user: XcampUser,
  noteId: string,
  input: { title: string; bodyMarkdown: string; projectId?: string | null; existingDetail: Record<string, unknown> },
): Promise<void> {
  const detail = { ...input.existingDetail };
  if (input.projectId) detail.project_id = input.projectId;
  else delete detail.project_id;

  const { error } = await supabase
    .from("notes")
    .update({
      title: input.title,
      body_markdown: input.bodyMarkdown,
      body_html: markdownToHtml(input.bodyMarkdown),
      detail,
      updated_at: new Date().toISOString(),
    })
    .eq("id", noteId)
    .eq("created_by", user.centralId);

  if (error) throw error;
}

export async function archiveNote(user: XcampUser, note: NoteRow): Promise<void> {
  const { error } = await supabase
    .from("notes")
    .update({
      detail: { ...note.detail, archived: true },
      updated_at: new Date().toISOString(),
    })
    .eq("id", note.id)
    .eq("created_by", user.centralId);

  if (error) throw error;
}

export async function listProjects(user: XcampUser): Promise<ProjectRow[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("id, name")
    .eq("tenant_id", user.tenantId)
    .order("name");

  if (error) throw error;
  return (data ?? []) as ProjectRow[];
}

export async function getLinkedNoteIds(noteIds: string[]): Promise<Set<string>> {
  if (noteIds.length === 0) return new Set();
  const { data } = await supabase
    .from("objective_notes")
    .select("note_id")
    .in("note_id", noteIds);
  return new Set((data ?? []).map((r: { note_id: string }) => r.note_id));
}
