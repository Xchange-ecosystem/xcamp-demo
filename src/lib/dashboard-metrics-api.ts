// Objective sidepanel + founder project dashboard metrics.
//
// "Linked item count" everywhere here means the same objective_notes-driven
// relationship LinkedItemsTab shows (see sidepanel-service.ts) — never
// note_links/proof (a separate table LinkedItemsTab never queries), and
// excluding the task's own parent-objective link, per the brief's "same
// parent/proof exclusions as Part A.5".
//
// "Proof" attachment counts read `notes.detail.attachments` on each task's
// linked proof notes (note_links, link_type='proof') — the live attachment
// mechanism this repo's editors use (see phase-0-audit-task-fullscreen-modal
// doc, B0b) — not the unused relational `attachments`/`attachment_links`
// tables.
import { supabase } from "@/lib/supabase";
import type { XcampUser } from "@/types/xcamp";

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

interface TaskRow {
  id: string;
  done: boolean;
  text: string;
}

async function fetchTaskRowsForNoteIds(noteIds: string[]): Promise<TaskRow[]> {
  if (!noteIds.length) return [];
  const { data, error } = await supabase
    .from("notes")
    .select("id, done, body_text, body_html")
    .in("id", noteIds)
    .eq("note_type", "task");
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    done: !!r.done,
    text: ((r.body_text as string | null) || htmlToText((r.body_html as string | null) ?? "")).trim(),
  }));
}

/** taskId -> count of attachments on that task's linked proof notes. */
async function fetchProofAttachmentCounts(taskIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>(taskIds.map((id) => [id, 0]));
  if (!taskIds.length) return counts;

  const { data: links, error: linkErr } = await supabase
    .from("note_links")
    .select("from_note_id, to_note_id")
    .in("from_note_id", taskIds)
    .eq("link_type", "proof");
  if (linkErr) throw linkErr;
  if (!links?.length) return counts;

  const proofNoteIds = [...new Set(links.map((l) => l.to_note_id as string))];
  const { data: proofNotes, error: noteErr } = await supabase
    .from("notes")
    .select("id, detail")
    .in("id", proofNoteIds);
  if (noteErr) throw noteErr;

  const attachmentsByProofNote = new Map<string, number>();
  for (const n of proofNotes ?? []) {
    const detail = (n.detail as Record<string, unknown> | null) ?? {};
    const atts = Array.isArray(detail.attachments) ? detail.attachments.length : 0;
    attachmentsByProofNote.set(n.id as string, atts);
  }

  for (const l of links) {
    const taskId = l.from_note_id as string;
    const add = attachmentsByProofNote.get(l.to_note_id as string) ?? 0;
    counts.set(taskId, (counts.get(taskId) ?? 0) + add);
  }
  return counts;
}

/** taskId -> total linked-objective count (before parent exclusion). */
async function fetchLinkedObjectiveCounts(taskIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>(taskIds.map((id) => [id, 0]));
  if (!taskIds.length) return counts;
  const { data, error } = await supabase
    .from("objective_notes")
    .select("note_id")
    .in("note_id", taskIds);
  if (error) throw error;
  for (const row of data ?? []) {
    const id = row.note_id as string;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

export interface ObjectiveSidepanelMetrics {
  tasksTotal: number;
  tasksCompleted: number;
  wordsTotal: number;
  wordsAvgPerTask: number;
  charsTotal: number;
  charsAvgPerTask: number;
  proofAttachmentsTotal: number;
  proofAttachmentsAvgPerTask: number;
  linkedItemsTotal: number;
  linkedItemsAvgPerTask: number;
}

export async function fetchObjectiveSidepanelMetrics(
  objectiveId: string,
): Promise<ObjectiveSidepanelMetrics> {
  const { data: links, error: linkErr } = await supabase
    .from("objective_notes")
    .select("note_id")
    .eq("objective_id", objectiveId);
  if (linkErr) throw linkErr;

  const noteIds = [...new Set((links ?? []).map((l) => l.note_id as string))];
  const tasks = await fetchTaskRowsForNoteIds(noteIds);
  const taskIds = tasks.map((t) => t.id);
  const n = taskIds.length || 1; // avoid divide-by-zero; totals stay 0 either way

  const [proofCounts, linkedCounts] = await Promise.all([
    fetchProofAttachmentCounts(taskIds),
    fetchLinkedObjectiveCounts(taskIds),
  ]);

  const wordsTotal = tasks.reduce((sum, t) => sum + wordCount(t.text), 0);
  const charsTotal = tasks.reduce((sum, t) => sum + t.text.length, 0);
  const proofAttachmentsTotal = taskIds.reduce((sum, id) => sum + (proofCounts.get(id) ?? 0), 0);
  // -1 to exclude this task's link back to the objective we're computing for.
  const linkedItemsTotal = taskIds.reduce(
    (sum, id) => sum + Math.max(0, (linkedCounts.get(id) ?? 0) - 1),
    0,
  );

  return {
    tasksTotal: taskIds.length,
    tasksCompleted: tasks.filter((t) => t.done).length,
    wordsTotal,
    wordsAvgPerTask: wordsTotal / n,
    charsTotal,
    charsAvgPerTask: charsTotal / n,
    proofAttachmentsTotal,
    proofAttachmentsAvgPerTask: proofAttachmentsTotal / n,
    linkedItemsTotal,
    linkedItemsAvgPerTask: linkedItemsTotal / n,
  };
}

/**
 * One summary-input entry per task under the objective, for the objective
 * AI summary: prefers each task's already-generated sidepanel summary
 * (`notes.detail.aiSummary`, see ai-summary.ts / TaskAiSummary) and falls
 * back to a truncated raw body when a task hasn't had one generated yet, so
 * the aggregate never silently skips a task.
 */
export async function fetchObjectiveTaskSummaryInputs(
  objectiveId: string,
): Promise<{ title: string; text: string }[]> {
  const { data: links, error: linkErr } = await supabase
    .from("objective_notes")
    .select("note_id")
    .eq("objective_id", objectiveId);
  if (linkErr) throw linkErr;

  const noteIds = [...new Set((links ?? []).map((l) => l.note_id as string))];
  if (!noteIds.length) return [];

  const { data, error } = await supabase
    .from("notes")
    .select("id, title, body_text, body_html, detail")
    .in("id", noteIds)
    .eq("note_type", "task");
  if (error) throw error;

  return (data ?? []).map((r) => {
    const detail = (r.detail as Record<string, unknown> | null) ?? {};
    const cached = detail.aiSummary as { text?: string } | undefined;
    const text =
      cached?.text ||
      ((r.body_text as string | null) || htmlToText((r.body_html as string | null) ?? "")).trim();
    return { title: (r.title as string) || "Untitled task", text };
  });
}

export interface ProjectDashboardMetrics {
  objectivesTotal: number;
  objectivesCompleted: number;
  tasksTotal: number;
  tasksAvgPerObjective: number;
  tasksCompletedTotal: number;
  tasksCompletedAvgPerObjective: number;
  proofAttachmentsTotal: number;
  proofAttachmentsAvgPerObjective: number;
  linkedItemsTotal: number;
  linkedItemsAvgPerObjective: number;
}

export async function fetchProjectDashboardMetrics(
  user: XcampUser,
  projectId: string,
): Promise<ProjectDashboardMetrics> {
  const { data: objRows, error: objErr } = await supabase
    .from("objectives")
    .select("id, status")
    .eq("project_id", projectId)
    .eq("tenant_id", user.tenantId);
  if (objErr) throw objErr;

  const objectiveIds = (objRows ?? []).map((o) => o.id as string);
  const objectivesTotal = objectiveIds.length;
  const objectivesCompleted = (objRows ?? []).filter(
    (o) => o.status === "done" || o.status === "completed",
  ).length;

  const empty: ProjectDashboardMetrics = {
    objectivesTotal,
    objectivesCompleted,
    tasksTotal: 0,
    tasksAvgPerObjective: 0,
    tasksCompletedTotal: 0,
    tasksCompletedAvgPerObjective: 0,
    proofAttachmentsTotal: 0,
    proofAttachmentsAvgPerObjective: 0,
    linkedItemsTotal: 0,
    linkedItemsAvgPerObjective: 0,
  };
  if (!objectiveIds.length) return empty;

  const { data: linkRows, error: linkErr } = await supabase
    .from("objective_notes")
    .select("objective_id, note_id")
    .in("objective_id", objectiveIds);
  if (linkErr) throw linkErr;

  const allNoteIds = [...new Set((linkRows ?? []).map((l) => l.note_id as string))];
  const tasks = await fetchTaskRowsForNoteIds(allNoteIds);
  const taskDoneById = new Map(tasks.map((t) => [t.id, t.done]));
  const taskIdSet = new Set(tasks.map((t) => t.id));

  // objectiveId -> distinct task ids linked to it (a task shared across
  // objectives is counted once per objective bucket — that's what "average
  // per objective" means — but each total below dedupes by task id first).
  const perObjectiveTaskIds = new Map<string, Set<string>>();
  for (const id of objectiveIds) perObjectiveTaskIds.set(id, new Set());
  for (const l of linkRows ?? []) {
    const noteId = l.note_id as string;
    if (!taskIdSet.has(noteId)) continue;
    perObjectiveTaskIds.get(l.objective_id as string)?.add(noteId);
  }

  const taskIds = [...taskIdSet];
  const [proofCounts, linkedCounts] = await Promise.all([
    fetchProofAttachmentCounts(taskIds),
    fetchLinkedObjectiveCounts(taskIds),
  ]);
  // -1 per task: exclude the one parent-objective link that put it in scope.
  const linkedCountForTask = (id: string) => Math.max(0, (linkedCounts.get(id) ?? 0) - 1);

  let tasksSumAcrossObjectives = 0;
  let completedSumAcrossObjectives = 0;
  let proofSumAcrossObjectives = 0;
  let linkedSumAcrossObjectives = 0;
  for (const objId of objectiveIds) {
    const ids = [...(perObjectiveTaskIds.get(objId) ?? [])];
    tasksSumAcrossObjectives += ids.length;
    completedSumAcrossObjectives += ids.filter((id) => taskDoneById.get(id)).length;
    proofSumAcrossObjectives += ids.reduce((sum, id) => sum + (proofCounts.get(id) ?? 0), 0);
    linkedSumAcrossObjectives += ids.reduce((sum, id) => sum + linkedCountForTask(id), 0);
  }

  const tasksTotal = taskIds.length;
  const tasksCompletedTotal = taskIds.filter((id) => taskDoneById.get(id)).length;
  const proofAttachmentsTotal = taskIds.reduce((sum, id) => sum + (proofCounts.get(id) ?? 0), 0);
  const linkedItemsTotal = taskIds.reduce((sum, id) => sum + linkedCountForTask(id), 0);

  return {
    objectivesTotal,
    objectivesCompleted,
    tasksTotal,
    tasksAvgPerObjective: tasksSumAcrossObjectives / objectivesTotal,
    tasksCompletedTotal,
    tasksCompletedAvgPerObjective: completedSumAcrossObjectives / objectivesTotal,
    proofAttachmentsTotal,
    proofAttachmentsAvgPerObjective: proofSumAcrossObjectives / objectivesTotal,
    linkedItemsTotal,
    linkedItemsAvgPerObjective: linkedSumAcrossObjectives / objectivesTotal,
  };
}
