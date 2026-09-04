import { getSupabaseClient } from "../supabase/client";
import type { ProjectSummary, ObjectiveSummary, NoteSummary } from "../types/context";

export async function fetchUserProjects(tenantId: string): Promise<ProjectSummary[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, title, description, status")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw new Error(error.message);
  return (data ?? []) as ProjectSummary[];
}

export async function fetchProjectObjectives(
  projectId: string,
  tenantId: string,
): Promise<ObjectiveSummary[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("objectives")
    .select("id, title, description, status, dimension, category")
    .eq("project_id", projectId)
    .eq("tenant_id", tenantId)
    .neq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []) as ObjectiveSummary[];
}

export async function fetchObjectiveNotes(
  objectiveId: string,
  tenantId: string,
): Promise<NoteSummary[]> {
  const supabase = getSupabaseClient();

  const { data: joinData, error: joinError } = await supabase
    .from("objective_notes")
    .select("note_id")
    .eq("objective_id", objectiveId);
  if (joinError) throw new Error(joinError.message);

  const noteIds = (Array.isArray(joinData) ? joinData : []).map(
    (r: { note_id: string }) => r.note_id,
  );
  if (noteIds.length === 0) return [];

  const { data, error } = await supabase
    .from("notes")
    .select("id, title, note_type, done")
    .in("id", noteIds)
    .in("note_type", ["task", "note"])
    .eq("tenant_id", tenantId)
    .order("done", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []) as NoteSummary[];
}
