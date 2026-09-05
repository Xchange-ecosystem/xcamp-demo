// Navigator data access — objectives + tasks for the project "browser" view.
// Adapted from the Xcamp Foundation navigator, using this app's supabase
// client and XcampUser identity.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Json } from "@/integrations/supabase/types";
import type { NoteAttachment, NoteRow, XcampUser } from "@/types/xcamp";

const NOTE_COLUMNS =
  "id, title, body_markdown, body_html, note_type, done, status, tags, detail, owner_central_id, tenant_id, created_at, updated_at";

export interface ObjectiveRow {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  project_id: string;
  sort_order: number | null;
  tasksCount: number;
  completedTasksCount: number;
  tasksGenerationStatus: string | null;
}

export interface NavTask {
  id: string;
  title: string | null;
  note_type: string | null;
  done: boolean | null;
  status: string | null;
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

/* ------------------------------------------------------------------ */
/* Objectives                                                          */
/* ------------------------------------------------------------------ */

export async function listObjectivesWithCounts(
  user: XcampUser,
  projectId: string,
): Promise<ObjectiveRow[]> {
  const { data: objs, error } = await supabase
    .from("objectives")
    .select("id, title, description, status, project_id, sort_order, tasks_generation_status")
    .eq("project_id", projectId)
    .eq("tenant_id", user.tenantId)
    .order("sort_order", { ascending: true });
  if (error) throw error;

  const objectives = (objs ?? []) as Record<string, unknown>[];
  const ids = objectives.map((o) => o.id as string);

  // Map objective -> note ids
  const counts = new Map<string, { total: number; done: number }>();
  if (ids.length) {
    const { data: links } = await supabase
      .from("objective_notes")
      .select("objective_id, note_id")
      .in("objective_id", ids);
    const noteIds = Array.from(new Set((links ?? []).map((l) => l.note_id as string)));
    const doneSet = new Set<string>();
    if (noteIds.length) {
      const { data: notes } = await supabase.from("notes").select("id, done").in("id", noteIds);
      (notes ?? []).forEach((n) => {
        if (n.done) doneSet.add(n.id as string);
      });
    }
    (links ?? []).forEach((l) => {
      const oid = l.objective_id as string;
      const entry = counts.get(oid) ?? { total: 0, done: 0 };
      entry.total += 1;
      if (doneSet.has(l.note_id as string)) entry.done += 1;
      counts.set(oid, entry);
    });
  }

  return objectives.map((o) => {
    const c = counts.get(o.id as string) ?? { total: 0, done: 0 };
    return {
      id: o.id as string,
      title: (o.title as string) ?? "",
      description: (o.description as string) ?? null,
      status: (o.status as string) ?? null,
      project_id: o.project_id as string,
      sort_order: (o.sort_order as number) ?? null,
      tasksCount: c.total,
      completedTasksCount: c.done,
      tasksGenerationStatus: (o.tasks_generation_status as string) ?? null,
    };
  });
}

export async function createObjective(projectId: string, title: string) {
  const { data, error } = await supabase.rpc("create_objective", {
    p_project_id: projectId,
    p_title: title,
  });
  if (error) throw error;
  return data;
}

export async function updateObjective(
  objectiveId: string,
  input: {
    title: string;
    description: string | null;
    // Attachments live in objectives.detail.attachments, same as notes.
    // Only pass these when you actually intend to write detail — omitting
    // them leaves the RPC's p_detail unset, which the function treats as
    // "no change" rather than clobbering existing detail with {}.
    attachments?: NoteAttachment[];
    existingDetail?: Record<string, unknown>;
  },
) {
  const rpcArgs: {
    p_objective_id: string;
    p_title: string;
    p_description: string;
    p_detail?: Json;
  } = {
    p_objective_id: objectiveId,
    p_title: input.title,
    p_description: input.description ?? "",
  };

  if (input.attachments !== undefined) {
    const detail = { ...(input.existingDetail ?? {}) };
    if (input.attachments.length) detail.attachments = input.attachments;
    else delete detail.attachments;
    rpcArgs.p_detail = detail as Json;
  }

  const { error } = await supabase.rpc("update_objective", rpcArgs);
  if (error) throw error;
}

/* ------------------------------------------------------------------ */
/* Tasks                                                               */
/* ------------------------------------------------------------------ */

export async function listObjectiveTasks(objectiveId: string): Promise<NavTask[]> {
  const { data: links } = await supabase
    .from("objective_notes")
    .select("note_id")
    .eq("objective_id", objectiveId);
  const ids = (links ?? []).map((l) => l.note_id as string);
  if (ids.length === 0) return [];
  const { data: notes } = await supabase
    .from("notes")
    .select("id, title, note_type, done, status")
    .in("id", ids)
    .order("updated_at", { ascending: false });
  return (notes ?? []) as NavTask[];
}

export async function listUnassignedProjectTasks(projectId: string): Promise<NavTask[]> {
  const { data: links } = await supabase
    .from("project_notes")
    .select("note_id")
    .eq("project_id", projectId);
  const ids = (links ?? []).map((l) => l.note_id as string);
  if (ids.length === 0) return [];
  const { data: assigned } = await supabase
    .from("objective_notes")
    .select("note_id")
    .in("note_id", ids);
  const assignedSet = new Set((assigned ?? []).map((a) => a.note_id as string));
  const onlyProject = ids.filter((i) => !assignedSet.has(i));
  if (onlyProject.length === 0) return [];
  const { data: notes } = await supabase
    .from("notes")
    .select("id, title, note_type, done, status")
    .in("id", onlyProject)
    .order("updated_at", { ascending: false });
  return (notes ?? []) as NavTask[];
}

export async function createTaskNote(
  user: XcampUser,
  projectId: string,
  args: { title: string; objectiveId: string | null },
) {
  const { data: note, error } = await supabase
    .from("notes")
    .insert({
      owner_central_id: user.centralId,
      tenant_id: user.tenantId,
      title: args.title,
      note_type: "task",
      done: false,
      // Created directly by the user in Navigator — already accepted.
      status: "active",
    })
    .select("id")
    .single();
  if (error) throw error;
  if (args.objectiveId) {
    await supabase.from("objective_notes").insert({
      objective_id: args.objectiveId,
      note_id: note.id,
      owner_central_id: user.centralId,
      tenant_id: user.tenantId,
    });
  } else {
    await supabase.from("project_notes").insert({
      project_id: projectId,
      note_id: note.id,
      owner_central_id: user.centralId,
      tenant_id: user.tenantId,
    });
  }
  return note;
}

export async function toggleNoteDone(noteId: string, done: boolean) {
  // Keep status in sync with done rather than tracking completion in two
  // places: completing reopens back to 'active', not 'inactive' — reopening
  // a task doesn't revoke its earlier acceptance.
  const { error } = await supabase
    .from("notes")
    .update({ done, status: done ? "completed" : "active" })
    .eq("id", noteId);
  if (error) throw error;
}

export async function getNoteById(noteId: string): Promise<NoteRow | null> {
  const { data, error } = await supabase
    .from("notes")
    .select(NOTE_COLUMNS)
    .eq("id", noteId)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToNote(data as Record<string, unknown>) : null;
}

/* ------------------------------------------------------------------ */
/* React Query hooks                                                   */
/* ------------------------------------------------------------------ */

export function useObjectives(user: XcampUser | null, projectId: string | null) {
  return useQuery({
    queryKey: ["nav-objectives", projectId, user?.tenantId],
    enabled: !!user && !!projectId,
    queryFn: () => listObjectivesWithCounts(user!, projectId!),
  });
}

export function useObjectiveTasks(objectiveId: string | null) {
  return useQuery({
    queryKey: ["nav-tasks", "objective", objectiveId],
    enabled: !!objectiveId,
    queryFn: () => listObjectiveTasks(objectiveId!),
  });
}

async function fetchObjectiveGenerationStatus(objectiveId: string): Promise<string | null> {
  const { data } = await supabase
    .from("objectives")
    .select("tasks_generation_status")
    .eq("id", objectiveId)
    .maybeSingle();
  return (data as { tasks_generation_status?: string } | null)?.tasks_generation_status ?? null;
}

export function useObjectiveGenerationStatus(objectiveId: string | null) {
  return useQuery({
    queryKey: ["nav-objective-gen-status", objectiveId],
    enabled: !!objectiveId,
    queryFn: () => fetchObjectiveGenerationStatus(objectiveId!),
    refetchInterval: (query) => (query.state.data === "generating" ? 2000 : false),
  });
}

/* ------------------------------------------------------------------ */
/* Combined search (objectives + notes/tasks)                          */
/* ------------------------------------------------------------------ */

export interface NavSearchResult {
  id: string;
  title: string;
  kind: "objective" | "note";
  noteType?: string;
  status?: string | null;
  done?: boolean;
  updatedAt: string;
}

// Matches objectives and notes/tasks for the active project only — objectives
// by project_id directly, notes via whatever links them into this project
// (objective_notes for objective-scoped tasks, project_notes for unassigned
// ones) — so results stay within the project the user is actually browsing.
export async function searchNavigatorItems(
  user: XcampUser,
  projectId: string,
  objectiveIds: string[],
  rawQuery: string,
): Promise<NavSearchResult[]> {
  const query = rawQuery.trim();
  if (!query) return [];

  const objectivesPromise = supabase
    .from("objectives")
    .select("id, title, status, updated_at")
    .eq("project_id", projectId)
    .eq("tenant_id", user.tenantId)
    .ilike("title", `%${query}%`)
    .limit(25);

  const noteIdsPromise = (async () => {
    const ids = new Set<string>();
    const [{ data: viaObjectives }, { data: viaProject }] = await Promise.all([
      objectiveIds.length
        ? supabase.from("objective_notes").select("note_id").in("objective_id", objectiveIds)
        : Promise.resolve({ data: [] as { note_id: string }[] }),
      supabase.from("project_notes").select("note_id").eq("project_id", projectId),
    ]);
    (viaObjectives ?? []).forEach((r) => ids.add(r.note_id as string));
    (viaProject ?? []).forEach((r) => ids.add(r.note_id as string));
    return Array.from(ids);
  })();

  const [{ data: objs }, noteIds] = await Promise.all([objectivesPromise, noteIdsPromise]);

  let notes: Record<string, unknown>[] = [];
  if (noteIds.length) {
    const { data } = await supabase
      .from("notes")
      .select("id, title, note_type, done, updated_at")
      .in("id", noteIds)
      .or(`title.ilike.%${query}%,body_text.ilike.%${query}%`)
      .limit(25);
    notes = (data ?? []) as Record<string, unknown>[];
  }

  const results: NavSearchResult[] = [
    ...(objs ?? []).map((o) => ({
      id: o.id as string,
      title: (o.title as string) ?? "",
      kind: "objective" as const,
      status: o.status as string | null,
      updatedAt: o.updated_at as string,
    })),
    ...notes.map((n) => ({
      id: n.id as string,
      title: (n.title as string) ?? "",
      kind: "note" as const,
      noteType: n.note_type as string,
      done: !!n.done,
      updatedAt: n.updated_at as string,
    })),
  ];

  // Relevance (exact > prefix > contains), then recency.
  const lowerQuery = query.toLowerCase();
  const rank = (title: string) => {
    const t = title.toLowerCase();
    if (t === lowerQuery) return 0;
    if (t.startsWith(lowerQuery)) return 1;
    return 2;
  };
  results.sort((a, b) => {
    const byRank = rank(a.title) - rank(b.title);
    if (byRank !== 0) return byRank;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return results;
}

export function useNavigatorSearch(
  user: XcampUser | null,
  projectId: string | null,
  objectiveIds: string[],
  query: string,
) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: ["nav-search", projectId, user?.tenantId, trimmed, objectiveIds],
    enabled: !!user && !!projectId && !!trimmed,
    queryFn: () => searchNavigatorItems(user!, projectId!, objectiveIds, trimmed),
  });
}

export function useUnassignedTasks(projectId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["nav-tasks", "unassigned", projectId],
    enabled: enabled && !!projectId,
    queryFn: () => listUnassignedProjectTasks(projectId!),
  });
}

export function useCreateObjective(user: XcampUser, projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (title: string) => createObjective(projectId, title),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["nav-objectives", projectId] }),
  });
}

export function useUpdateObjective(user: XcampUser, projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { objectiveId: string; title: string; description: string | null }) =>
      updateObjective(input.objectiveId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["nav-objectives", projectId] }),
  });
}

export function useCreateTask(user: XcampUser, projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { title: string; objectiveId: string | null }) =>
      createTaskNote(user, projectId, args),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nav-tasks"] });
      qc.invalidateQueries({ queryKey: ["nav-objectives", projectId] });
    },
  });
}

export function useToggleTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; done: boolean }) => toggleNoteDone(args.id, args.done),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nav-tasks"] });
      qc.invalidateQueries({ queryKey: ["nav-objectives", projectId] });
    },
  });
}

// Silence unused Json import in environments where detail typing changes.
export type { Json };
