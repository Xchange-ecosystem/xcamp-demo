// Do & Document — proof notes data access.
//
// Data model (decided jointly with the backend session): each deliverable
// under a task is its own `notes` row with `note_type = 'proof'`, connected
// to the parent task note via `note_links` (`link_type = 'proof'`). This is
// a different link mechanism from `objective_notes` (task ↔ objective) used
// by the Labels/Linked Items tabs — proof notes deliberately never flow
// through that path, which is also why "Linked Items" (ItemSidepanel's
// LinkedItemsTab, driven by objective_notes only) already excludes them
// without any extra filtering needed here.
//
// Link direction: from_note_id = the task note, to_note_id = the proof note.
import { supabase } from "@/lib/supabase";
import type { Json } from "@/integrations/supabase/types";
import type { NoteAttachment, NoteRow, XcampUser } from "@/types/xcamp";

const PROOF_LINK_TYPE = "proof";

const PROOF_NOTE_COLUMNS =
  "id, title, body_markdown, body_html, note_type, done, status, tags, detail, owner_central_id, tenant_id, created_at, updated_at";

function rowToNote(r: Record<string, unknown>): NoteRow {
  return {
    id: r.id as string,
    title: (r.title as string) ?? "",
    body_markdown: (r.body_markdown as string) ?? null,
    body_html: (r.body_html as string) ?? null,
    note_type: r.note_type as string,
    done: !!r.done,
    status: (r.status as string | null) ?? null,
    tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
    detail: (r.detail as Record<string, unknown>) ?? {},
    created_by: r.owner_central_id as string,
    tenant_id: r.tenant_id as string,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  };
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** All proof notes linked to a task, newest link first. */
export async function fetchProofNotes(taskNoteId: string): Promise<NoteRow[]> {
  const { data: links, error: linkErr } = await supabase
    .from("note_links")
    .select("to_note_id, created_at")
    .eq("from_note_id", taskNoteId)
    .eq("link_type", PROOF_LINK_TYPE)
    .order("created_at", { ascending: true });
  if (linkErr) throw linkErr;
  if (!links?.length) return [];

  const noteIds = links.map((l) => l.to_note_id as string);
  const { data: notes, error: noteErr } = await supabase
    .from("notes")
    .select(PROOF_NOTE_COLUMNS)
    .in("id", noteIds);
  if (noteErr) throw noteErr;

  const byId = new Map((notes ?? []).map((n) => [n.id as string, rowToNote(n)]));
  // Preserve link order (oldest linked first, i.e. stable left-to-right tabs).
  return noteIds.map((id) => byId.get(id)).filter((n): n is NoteRow => !!n);
}

/** Creates a brand-new proof note and links it to the task in one step ("+ New Tab"). */
export async function createProofNote(
  user: XcampUser,
  taskNoteId: string,
  title = "Untitled deliverable",
): Promise<NoteRow> {
  const { data, error } = await supabase
    .from("notes")
    .insert({
      title,
      body_markdown: "",
      body_html: "",
      body_text: "",
      note_type: PROOF_LINK_TYPE,
      done: false,
      status: null,
      tags: [],
      detail: {} as Json,
      owner_central_id: user.centralId,
      tenant_id: user.tenantId,
    })
    .select(PROOF_NOTE_COLUMNS)
    .single();
  if (error) throw error;

  const { error: linkErr } = await supabase.rpc("link_notes", {
    p_from_note_id: taskNoteId,
    p_to_note_id: data.id as string,
    p_link_type: PROOF_LINK_TYPE,
  });
  if (linkErr) throw linkErr;

  return rowToNote(data);
}

/**
 * Converts an existing `note_type='note'` into a proof note and links it to
 * the task — the "switching type=note to type=proof" flow. Placed here
 * (next to "+ New Tab") rather than in the Linked Items tab's add/suggest
 * controls: those operate on `objective_notes` links between a task and
 * objectives, a different relationship than a proof deliverable attached to
 * this task, so reusing that picker would conflate the two link types in
 * one control. Flagging this placement choice rather than assuming it's
 * the only reasonable read of "switching type=note to type=proof".
 */
export async function linkExistingNoteAsProof(
  user: XcampUser,
  taskNoteId: string,
  existingNoteId: string,
): Promise<NoteRow> {
  const { data, error } = await supabase
    .from("notes")
    .update({ note_type: PROOF_LINK_TYPE, updated_at: new Date().toISOString() })
    .eq("id", existingNoteId)
    .eq("owner_central_id", user.centralId)
    .select(PROOF_NOTE_COLUMNS)
    .single();
  if (error) throw error;

  const { error: linkErr } = await supabase.rpc("link_notes", {
    p_from_note_id: taskNoteId,
    p_to_note_id: existingNoteId,
    p_link_type: PROOF_LINK_TYPE,
  });
  if (linkErr) throw linkErr;

  return rowToNote(data);
}

/** Unlinks a proof note from the task (does not delete/archive the note itself). */
export async function unlinkProofNote(taskNoteId: string, proofNoteId: string): Promise<void> {
  const { error } = await supabase
    .from("note_links")
    .delete()
    .eq("from_note_id", taskNoteId)
    .eq("to_note_id", proofNoteId)
    .eq("link_type", PROOF_LINK_TYPE);
  if (error) throw error;
}

/** Renames a proof note (the left sub-panel's editable tab title). */
export async function renameProofNote(
  user: XcampUser,
  proofNoteId: string,
  title: string,
): Promise<void> {
  const { error } = await supabase
    .from("notes")
    .update({ title: title.trim() || "Untitled deliverable", updated_at: new Date().toISOString() })
    .eq("id", proofNoteId)
    .eq("owner_central_id", user.centralId);
  if (error) throw error;
}

/** Autosaves a proof note's rich-text body. */
export async function updateProofNoteBody(
  user: XcampUser,
  proofNoteId: string,
  bodyHtml: string,
): Promise<void> {
  const { error } = await supabase
    .from("notes")
    .update({
      body_markdown: bodyHtml,
      body_html: bodyHtml,
      body_text: htmlToText(bodyHtml),
      updated_at: new Date().toISOString(),
    })
    .eq("id", proofNoteId)
    .eq("owner_central_id", user.centralId);
  if (error) throw error;
}

/**
 * Patches a proof note's `detail` (used for its own `attachments` array —
 * scoped to the proof note's id, same `notes.detail.attachments` shape the
 * task-level About/Do & Document tabs already use, just on a different row).
 */
export async function patchProofNoteDetail(
  user: XcampUser,
  proofNoteId: string,
  existingDetail: Record<string, unknown>,
  patch: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase
    .from("notes")
    .update({
      detail: { ...existingDetail, ...patch } as Json,
      updated_at: new Date().toISOString(),
    })
    .eq("id", proofNoteId)
    .eq("owner_central_id", user.centralId);
  if (error) throw error;
}

/**
 * "Create Action or Artefact" — ties into the existing `dynamix_action_suggestions`
 * table (DynamiX/Copilot suggestion system). No UI in this repo reads or writes
 * that table today (repo-wide grep turns up only the generated schema types), so
 * there's no existing card/list surface to slot into — this creates a real row
 * in the shared vocabulary (status='pending', scoped to the proof note + its
 * task's tenant) rather than inventing a new suggestions table. Surfacing these
 * suggestions elsewhere in the product is future work, out of scope here.
 */
export async function createActionSuggestion(
  user: XcampUser,
  proofNoteId: string,
  input: { title: string; suggestionType: "action" | "artefact" },
): Promise<void> {
  const { error } = await supabase.from("dynamix_action_suggestions").insert({
    note_id: proofNoteId,
    title: input.title,
    suggestion_type: input.suggestionType,
    status: "pending",
    owner_central_id: user.centralId,
    tenant_id: user.tenantId,
  });
  if (error) throw error;
}

export type { NoteAttachment };
