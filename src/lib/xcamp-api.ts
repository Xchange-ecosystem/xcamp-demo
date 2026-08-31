// Xcamp Journal data access — direct Supabase table access only.
// No RPCs. Journal only writes `notes` with note_type='note'.
import { supabase } from "@/lib/supabase";
import { voxFetch } from "@/integrations/vox/client";
import type { Json } from "@/integrations/supabase/types";
import type { CollabRole, NoteAttachment, NoteRow, ProjectFull, ProjectRow, XcampUser } from "@/types/xcamp";

const NOTE_COLUMNS =
  "id, title, body_markdown, body_html, note_type, done, status, tags, detail, owner_central_id, tenant_id, created_at, updated_at";

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

export interface TenantMemberSummary {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  projectCount: number;
}

// All central_users in the caller's tenant, with a real "number of projects"
// count derived from object_memberships (object_type='project') — counts any
// project a user is a member of, not just ones they own. Used by the Ecosystem
// Navigator's tile grid (same query/component for founder and investor personas).
export async function listTenantMembers(user: XcampUser): Promise<TenantMemberSummary[]> {
  const { data: userRows } = await supabase
    .from("central_users")
    .select("id, display_name, preferences")
    .eq("tenant_id", user.tenantId);

  const { data: memberRows } = await supabase
    .from("object_memberships")
    .select("user_central_id")
    .eq("tenant_id", user.tenantId)
    .eq("object_type", "project");

  const projectCounts = new Map<string, number>();
  for (const row of memberRows ?? []) {
    const uid = row.user_central_id as string;
    projectCounts.set(uid, (projectCounts.get(uid) ?? 0) + 1);
  }

  return (userRows ?? []).map((row) => {
    const prefs =
      row.preferences && typeof row.preferences === "object" && !Array.isArray(row.preferences)
        ? (row.preferences as Record<string, unknown>)
        : {};
    return {
      id: row.id as string,
      displayName: (row.display_name as string | null) ?? "Member",
      avatarUrl: (prefs.avatar_url as string | undefined) ?? null,
      projectCount: projectCounts.get(row.id as string) ?? 0,
    };
  });
}

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
  // Returns notes of every note_type — NOTE_TYPES is the curated set a user
  // can *assign* in the editor, not an exhaustive list of what's in the
  // database (e.g. legacy/system-written rows can carry other values), so
  // it must not be used to restrict what this query fetches. Narrowing to a
  // subset of types is a UI-level concern (see NotesBrowser's Type filter).
  const { data, error } = await supabase
    .from("notes")
    .select(NOTE_COLUMNS)
    .eq("owner_central_id", user.centralId)
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
  const noteType = input.noteType ?? "note";

  const { data, error } = await supabase
    .from("notes")
    .insert({
      title: input.title,
      body_markdown: input.bodyHtml,
      body_html: input.bodyHtml,
      body_text: htmlToText(input.bodyHtml),
      note_type: noteType,
      done: false,
      // Every call site creates the note directly at the user's request
      // (editor save, journal save, or confirming a suggestion card) —
      // already accepted by construction.
      status: noteType === "task" ? "active" : null,
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
  // NoteEditor already decides which objective links to keep (it preserves
  // links for notes with no project, like Navigator tasks, and only clears
  // them when a project is actively unassigned) — don't re-gate on projectId
  // here, or every save on a project-less note wipes its objective links.
  await syncObjectiveLinks(user, noteId, input.objectiveIds ?? []);
}

// Replace the objective_notes links for a note with the provided objective ids.
export async function syncObjectiveLinks(user: XcampUser, noteId: string, objectiveIds: string[]) {
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


// About tab's own field slice: title / main body / tags. Deliberately does NOT
// touch `detail` or objective_notes links (unlike updateNote, which is a full
// NoteEditor-form save and would wipe objective links if called with no
// projectId/objectiveIds) — the About tab has no project/objective editor of
// its own, so it must never touch that state.
export async function updateTaskCore(
  user: XcampUser,
  noteId: string,
  input: { title: string; bodyHtml: string; tags: string[] },
): Promise<void> {
  const { error } = await supabase
    .from("notes")
    .update({
      title: input.title,
      body_markdown: input.bodyHtml,
      body_html: input.bodyHtml,
      body_text: htmlToText(input.bodyHtml),
      tags: input.tags,
      updated_at: new Date().toISOString(),
    })
    .eq("id", noteId)
    .eq("owner_central_id", user.centralId);

  if (error) throw error;
}

// Patch notes.detail without touching title/body/tags — used by tabs that only
// own a slice of `detail` (e.g. Do & Document's blob, the Attachments list
// shared between the About and Do & Document tabs) so they never clobber
// fields another tab is responsible for.
export async function patchNoteDetail(
  user: XcampUser,
  noteId: string,
  existingDetail: Record<string, unknown>,
  patch: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase
    .from("notes")
    .update({
      detail: { ...existingDetail, ...patch } as Json,
      updated_at: new Date().toISOString(),
    })
    .eq("id", noteId)
    .eq("owner_central_id", user.centralId);

  if (error) throw error;
}

// Set up accordion — Timeframe. `notes.start_date` / `notes.end_date` (both
// `date`, nullable) — added specifically for the task fullscreen modal.
export async function updateTaskTimeframe(
  user: XcampUser,
  noteId: string,
  input: { startDate: string | null; endDate: string | null },
): Promise<void> {
  const { error } = await supabase
    .from("notes")
    .update({
      start_date: input.startDate,
      end_date: input.endDate,
      updated_at: new Date().toISOString(),
    })
    .eq("id", noteId)
    .eq("owner_central_id", user.centralId);

  if (error) throw error;
}

export interface TaskLabelObjective {
  id: string;
  title: string;
  dimension: string | null;
  category: string | null;
  projectId: string;
  projectTitle: string;
}

// Labels and tags accordion — Project / Objectives / Dimension / Category.
// Resolved via objective_notes -> objectives -> projects; notes carries no
// dedicated columns for these (they're properties of the linked objective).
export async function getTaskLabels(noteId: string): Promise<TaskLabelObjective[]> {
  const { data: links } = await supabase
    .from("objective_notes")
    .select("objective_id")
    .eq("note_id", noteId);
  const objectiveIds = (links ?? []).map((l) => l.objective_id as string);
  if (!objectiveIds.length) return [];

  const { data: objectives, error } = await supabase
    .from("objectives")
    .select("id, title, dimension, category, project_id, projects(title)")
    .in("id", objectiveIds);
  if (error) throw error;

  return (objectives ?? []).map((o) => {
    const raw = o as unknown as Record<string, unknown>;
    const project = raw.projects as { title: string } | null;
    return {
      id: raw.id as string,
      title: (raw.title as string) || "Untitled objective",
      dimension: (raw.dimension as string) || null,
      category: (raw.category as string) || null,
      projectId: raw.project_id as string,
      projectTitle: project?.title || "Untitled project",
    };
  });
}

// Set up accordion — Created by (read-only) / Owned by (deferred, display-only).
// owner_central_id is the only creator concept notes has; it's stamped once at
// insert and never changed by any code path today, so it doubles as "created
// by" for display. Reassignment ("owned by") is a separate, deferred concern —
// this only reads the name, it never writes anything.
export async function getUserDisplayName(centralId: string): Promise<string | null> {
  const { data } = await supabase
    .from("central_users")
    .select("display_name")
    .eq("id", centralId)
    .maybeSingle();
  return (data?.display_name as string | undefined) ?? null;
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

async function getAccessibleProjectIds(user: XcampUser): Promise<string[]> {
  const { data } = await supabase
    .from("object_memberships")
    .select("object_id")
    .eq("object_type", "project")
    .eq("user_central_id", user.centralId)
    .eq("status", "active");
  return (data ?? []).map((m) => m.object_id as string);
}

export async function listProjects(user: XcampUser): Promise<ProjectRow[]> {
  const memberIds = await getAccessibleProjectIds(user);
  const memberFilter = memberIds.length > 0 ? `,id.in.(${memberIds.join(",")})` : "";

  const { data, error } = await supabase
    .from("projects")
    .select("id, title")
    .eq("tenant_id", user.tenantId)
    .or(`owner_central_id.eq.${user.centralId},visibility_scope.eq.global,visibility_scope.eq.organization_only${memberFilter}`)
    .order("title");

  if (error) throw error;
  return (data ?? [])
    .filter((p) => (p.title as string) !== "__general__")
    .map((p) => ({ id: p.id as string, name: (p.title as string) ?? "Untitled" }));
}

export async function listProjectsFull(user: XcampUser): Promise<ProjectFull[]> {
  const memberIds = await getAccessibleProjectIds(user);
  const memberFilter = memberIds.length > 0 ? `,id.in.(${memberIds.join(",")})` : "";

  // Supabase generated types are stale — feature_image exists in DB but isn't
  // reflected yet. Cast through unknown to allow the column in the select.
  const { data, error } = await (supabase
    .from("projects")
    .select("id, title, feature_image, color, description, updated_at")
    .eq("tenant_id", user.tenantId)
    .or(`owner_central_id.eq.${user.centralId},visibility_scope.eq.global,visibility_scope.eq.organization_only${memberFilter}`)
    .order("title") as unknown as Promise<{
    data: Array<Record<string, unknown>> | null;
    error: { message: string } | null;
  }>);

  if (error) throw new Error(error.message);
  return (data ?? [])
    .filter((p) => (p["title"] as string) !== "__general__")
    .map((p) => ({
      id: p["id"] as string,
      name: (p["title"] as string) ?? "Untitled",
      feature_image: (p["feature_image"] as string | null) ?? null,
      color: (p["color"] as string | null) ?? null,
      description: (p["description"] as string | null) ?? null,
      updated_at: (p["updated_at"] as string | null) ?? new Date(0).toISOString(),
    }));
}

export async function getLinkedNoteIds(noteIds: string[]): Promise<Set<string>> {
  if (noteIds.length === 0) return new Set();
  const { data } = await supabase
    .from("objective_notes")
    .select("note_id")
    .in("note_id", noteIds);
  return new Set((data ?? []).map((r) => r.note_id as string));
}

/**
 * Calls the backend auto-tag endpoint, then patches the note's tags in Supabase.
 * Only runs when the note has no manually-set tags. Fire-and-forget safe.
 */
export async function autoTagNote(
  user: XcampUser,
  noteId: string,
  title: string,
  bodyHtml: string,
): Promise<string[]> {
  const bodyText = bodyHtml
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 800);

  const res = await voxFetch("/api/notes/auto-tag", {
    method: "POST",
    body: JSON.stringify({ title, body: bodyText }),
  });
  if (!res.ok) throw new Error(`[auto-tag] ${res.status}`);

  const { tags } = (await res.json()) as { tags: string[] };
  if (!tags?.length) return [];

  await supabase
    .from("notes")
    .update({ tags, updated_at: new Date().toISOString() })
    .eq("id", noteId)
    .eq("owner_central_id", user.centralId);

  return tags;
}

// ── Portfolio data layer ──────────────────────────────────────────────────────

export interface ProjectPortfolioItem {
  id: string;
  name: string;
  feature_image: string | null;
  color: string | null;
  description: string | null;
  updated_at: string;
  owner_central_id: string;
  tags: string[] | null;
  status: string | null;
  collab_role: CollabRole | null;
  collaborator_count: number;
}

export interface ObjectiveProgress {
  total: number;
  done: number;
}
export type ObjectiveProgressMap = Record<string, ObjectiveProgress>;

export async function listProjectsForPortfolio(
  user: XcampUser,
): Promise<ProjectPortfolioItem[]> {
  const memberIds = await getAccessibleProjectIds(user);
  const memberFilter = memberIds.length > 0 ? `,id.in.(${memberIds.join(",")})` : "";

  const { data: projectData, error: projectError } = await (supabase
    .from("projects")
    .select("id, title, feature_image, color, description, updated_at, owner_central_id, tags, status")
    .eq("tenant_id", user.tenantId)
    .or(
      `owner_central_id.eq.${user.centralId},visibility_scope.eq.global,visibility_scope.eq.organization_only${memberFilter}`,
    )
    .order("title") as unknown as Promise<{
    data: Array<Record<string, unknown>> | null;
    error: { message: string } | null;
  }>);

  if (projectError) throw new Error(projectError.message);
  const projects = (projectData ?? []).filter(
    (p) => (p["title"] as string) !== "__general__",
  );

  if (projects.length === 0) return [];

  const projectIds = projects.map((p) => p["id"] as string);

  const [collabData, countData] = await Promise.all([
    supabase
      .from("collaborators")
      .select("object_id, role")
      .eq("user_id", user.centralId)
      .eq("object_type", "project")
      .eq("tenant_id", user.tenantId)
      .in("object_id", projectIds)
      .eq("status", "active"),
    supabase
      .from("collaborators")
      .select("object_id")
      .eq("object_type", "project")
      .eq("tenant_id", user.tenantId)
      .in("object_id", projectIds)
      .eq("status", "active"),
  ]);

  const collabRoleByProject: Record<string, CollabRole> = {};
  for (const c of collabData.data ?? []) {
    collabRoleByProject[c.object_id as string] = c.role as CollabRole;
  }

  const collabCountByProject: Record<string, number> = {};
  for (const c of countData.data ?? []) {
    const oid = c.object_id as string;
    collabCountByProject[oid] = (collabCountByProject[oid] ?? 0) + 1;
  }

  return projects.map((p) => ({
    id: p["id"] as string,
    name: (p["title"] as string) ?? "Untitled",
    feature_image: (p["feature_image"] as string | null) ?? null,
    color: (p["color"] as string | null) ?? null,
    description: (p["description"] as string | null) ?? null,
    updated_at: (p["updated_at"] as string | null) ?? new Date(0).toISOString(),
    owner_central_id: (p["owner_central_id"] as string) ?? "",
    tags: (p["tags"] as string[] | null) ?? null,
    status: (p["status"] as string | null) ?? null,
    collab_role: collabRoleByProject[(p["id"] as string)] ?? null,
    collaborator_count: collabCountByProject[(p["id"] as string)] ?? 0,
  }));
}

export async function fetchProjectObjectiveProgress(
  user: XcampUser,
  projectIds: string[],
): Promise<ObjectiveProgressMap> {
  if (!projectIds.length) return {};

  const { data, error } = await supabase
    .from("objectives")
    .select("project_id, status")
    .in("project_id", projectIds)
    .eq("tenant_id", user.tenantId);

  if (error) throw new Error(error.message);

  const result: ObjectiveProgressMap = {};
  for (const id of projectIds) result[id] = { total: 0, done: 0 };

  for (const row of data ?? []) {
    const pid = row.project_id as string;
    if (!result[pid]) continue;
    result[pid].total++;
    const s = row.status as string;
    if (s === "done" || s === "completed") result[pid].done++;
  }

  return result;
}

export type ProjectMetrics = Record<string, { objectives: number; tasks: number }>;

/**
 * Batch-fetch objective and task counts for a set of project IDs.
 * Uses the relational path objectives → objective_notes → notes(note_type='task').
 * 3 sequential queries, no N+1 — scales with project count regardless of size.
 */
export async function fetchProjectMetrics(
  user: XcampUser,
  projectIds: string[],
): Promise<ProjectMetrics> {
  if (!projectIds.length) return {};

  const result: ProjectMetrics = {};
  for (const id of projectIds) result[id] = { objectives: 0, tasks: 0 };

  // Q1: all objectives for these projects
  const { data: objRows } = await supabase
    .from("objectives")
    .select("id, project_id")
    .in("project_id", projectIds)
    .eq("tenant_id", user.tenantId);

  const objToProject: Record<string, string> = {};
  for (const obj of objRows ?? []) {
    const pid = obj.project_id as string;
    if (result[pid]) {
      result[pid].objectives++;
      objToProject[obj.id as string] = pid;
    }
  }

  const objectiveIds = Object.keys(objToProject);
  if (!objectiveIds.length) return result;

  // Q2: links from those objectives to notes
  const { data: linkRows } = await supabase
    .from("objective_notes")
    .select("objective_id, note_id")
    .in("objective_id", objectiveIds);

  const noteIds = [...new Set((linkRows ?? []).map((l) => l.note_id as string))];
  if (!noteIds.length) return result;

  // Q3: filter note IDs down to task notes only
  const { data: taskNoteRows } = await supabase
    .from("notes")
    .select("id")
    .in("id", noteIds)
    .eq("note_type", "task");

  const taskNoteIds = new Set((taskNoteRows ?? []).map((n) => n.id as string));

  // Count unique task notes per project (a note linked to multiple objectives in the
  // same project counts once; a note shared across projects is counted per-project)
  const tasksByProject: Record<string, Set<string>> = {};
  for (const id of projectIds) tasksByProject[id] = new Set();

  for (const link of linkRows ?? []) {
    const noteId = link.note_id as string;
    const pid = objToProject[link.objective_id as string];
    if (pid && taskNoteIds.has(noteId)) tasksByProject[pid].add(noteId);
  }

  for (const id of projectIds) result[id].tasks = tasksByProject[id].size;

  return result;
}

export interface ProjectDetailMetrics {
  objectives: number;
  totalTasks: number;
  openTasks: number;
}

export async function fetchProjectDetailMetrics(
  user: XcampUser,
  projectId: string,
): Promise<ProjectDetailMetrics> {
  const result: ProjectDetailMetrics = { objectives: 0, totalTasks: 0, openTasks: 0 };

  const { data: objRows } = await supabase
    .from("objectives")
    .select("id")
    .eq("project_id", projectId)
    .eq("tenant_id", user.tenantId);

  result.objectives = (objRows ?? []).length;
  const objectiveIds = (objRows ?? []).map((o) => o.id as string);
  if (!objectiveIds.length) return result;

  const { data: linkRows } = await supabase
    .from("objective_notes")
    .select("note_id")
    .in("objective_id", objectiveIds);

  const noteIds = [...new Set((linkRows ?? []).map((l) => l.note_id as string))];
  if (!noteIds.length) return result;

  const { data: taskRows } = await supabase
    .from("notes")
    .select("id, done")
    .in("id", noteIds)
    .eq("note_type", "task");

  result.totalTasks = (taskRows ?? []).length;
  result.openTasks = (taskRows ?? []).filter((n) => !n.done).length;

  return result;
}
