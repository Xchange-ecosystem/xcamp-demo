// Navigator data access — objectives + tasks for the project "browser" view.
// Adapted from the Xcamp Foundation navigator, using this app's supabase
// client and XcampUser identity.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { NoteRow, XcampUser } from "@/types/xcamp";

const NOTE_COLUMNS =
  "id, title, body_markdown, body_html, note_type, done, tags, detail, owner_central_id, tenant_id, created_at, updated_at";

export interface ObjectiveRow {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  project_id: string;
  sort_order: number | null;
  tasksCount: number;
  completedTasksCount: number;
}

export interface NavTask {
  id: string;
  title: string | null;
  note_type: string | null;
  done: boolean | null;
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

/* ------------------------------------------------------------------ */
/* Objectives                                                          */
/* ------------------------------------------------------------------ */

export async function listObjectivesWithCounts(
  user: XcampUser,
  projectId: string,
): Promise<ObjectiveRow[]> {
  const { data: objs, error } = await supabase
    .from("objectives")
    .select("id, title, description, status, project_id, sort_order")
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
      const { data: notes } = await supabase
        .from("notes")
        .select("id, done")
        .in("id", noteIds);
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
    };
  });
}

export async function createObjective(user: XcampUser, projectId: string, title: string) {
  const { data, error } = await supabase
    .from("objectives")
    .insert({
      project_id: projectId,
      owner_central_id: user.centralId,
      tenant_id: user.tenantId,
      title,
    })
    .select("id, title, description, status, project_id, sort_order")
    .single();
  if (error) throw error;
  return data;
}

export async function updateObjective(
  user: XcampUser,
  objectiveId: string,
  input: { title: string; description: string | null; status: string | null },
) {
  const { error } = await supabase
    .from("objectives")
    .update({
      title: input.title,
      description: input.description,
      status: input.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", objectiveId)
    .eq("tenant_id", user.tenantId);
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
    .select("id, title, note_type, done")
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
    .select("id, title, note_type, done")
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
    await supabase
      .from("project_notes")
      .insert({
        project_id: projectId,
        note_id: note.id,
        owner_central_id: user.centralId,
        tenant_id: user.tenantId,
      });
  }
  return note;
}

export async function toggleNoteDone(noteId: string, done: boolean) {
  const { error } = await supabase.from("notes").update({ done }).eq("id", noteId);
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
    mutationFn: (title: string) => createObjective(user, projectId, title),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["nav-objectives", projectId] }),
  });
}

export function useUpdateObjective(user: XcampUser, projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      objectiveId: string;
      title: string;
      description: string | null;
      status: string | null;
    }) => updateObjective(user, input.objectiveId, input),
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
