// Daily snapshot reads for the founder project dashboard's timeline + dot
// plot — `objective_metrics_daily` / `project_metrics_daily`. Confirmed live
// against the DB directly (Supabase MCP), not against committed migrations
// in this repo (which don't have them — that's what caused the original
// Part C session to wrongly report these tables as missing). Both tables
// carry a SELECT-only, tenant-isolated RLS policy, so these reads work with
// the anon client like any other table — no new endpoint needed.
//
// IMPORTANT: the daily job does not yet backfill a zero-value row for an
// objective/project with no tasks (a confirmed gap, not yet fixed as of this
// writing — 106 objectives exist tenant-wide, only 36 have a snapshot row on
// the latest date, and every objective with zero task links is the one
// missing a row, never a `tasks_total: 0` row). So: **absence of a snapshot
// row must never be read as "zero"** — it means "no data yet" and has to be
// excluded/labeled as such, not defaulted to 0. Once the backend LEFT JOIN
// fix lands this gap closes on its own; nothing here should need to change,
// since the fetchers already treat "no row" as "no data" rather than zero.
import { supabase } from "@/lib/supabase";
import type { XcampUser } from "@/types/xcamp";

export interface ProjectMetricsSnapshot {
  snapshotDate: string;
  objectivesTotal: number;
  objectivesCompleted: number;
  tasksTotal: number;
  tasksAvgPerObjective: number;
  tasksCompletedTotal: number;
  tasksCompletedAvgPerObjective: number;
  attachmentCountTotal: number;
  attachmentCountAvgPerObjective: number;
  linkedItemCountTotal: number;
  linkedItemCountAvgPerObjective: number;
}

/** Project-level daily snapshots for the timeline, ascending by date. */
export async function fetchProjectMetricsTimeline(
  user: XcampUser,
  projectId: string,
  range: { from: string; to: string },
): Promise<ProjectMetricsSnapshot[]> {
  const { data, error } = await supabase
    .from("project_metrics_daily")
    .select(
      "snapshot_date, objectives_total, objectives_completed, tasks_total, tasks_avg_per_objective, tasks_completed_total, tasks_completed_avg_per_objective, attachment_count_total, attachment_count_avg_per_objective, linked_item_count_total, linked_item_count_avg_per_objective",
    )
    .eq("project_id", projectId)
    .eq("tenant_id", user.tenantId)
    .gte("snapshot_date", range.from)
    .lte("snapshot_date", range.to)
    .order("snapshot_date", { ascending: true });
  if (error) throw error;

  return (data ?? []).map((r) => ({
    snapshotDate: r.snapshot_date as string,
    objectivesTotal: (r.objectives_total as number) ?? 0,
    objectivesCompleted: (r.objectives_completed as number) ?? 0,
    tasksTotal: (r.tasks_total as number) ?? 0,
    tasksAvgPerObjective: (r.tasks_avg_per_objective as number) ?? 0,
    tasksCompletedTotal: (r.tasks_completed_total as number) ?? 0,
    tasksCompletedAvgPerObjective: (r.tasks_completed_avg_per_objective as number) ?? 0,
    attachmentCountTotal: (r.attachment_count_total as number) ?? 0,
    attachmentCountAvgPerObjective: (r.attachment_count_avg_per_objective as number) ?? 0,
    linkedItemCountTotal: (r.linked_item_count_total as number) ?? 0,
    linkedItemCountAvgPerObjective: (r.linked_item_count_avg_per_objective as number) ?? 0,
  }));
}

/** Earliest/latest snapshot_date available for this project — for initializing the date-range filter. */
export async function fetchProjectSnapshotBounds(
  user: XcampUser,
  projectId: string,
): Promise<{ min: string; max: string } | null> {
  const { data, error } = await supabase
    .from("project_metrics_daily")
    .select("snapshot_date")
    .eq("project_id", projectId)
    .eq("tenant_id", user.tenantId)
    .order("snapshot_date", { ascending: true });
  if (error) throw error;
  if (!data?.length) return null;
  return {
    min: data[0].snapshot_date as string,
    max: data[data.length - 1].snapshot_date as string,
  };
}

export interface ObjectiveMetricsSnapshot {
  objectiveId: string;
  objectiveTitle: string;
  snapshotDate: string;
  tasksTotal: number;
  tasksCompleted: number;
  wordCountTotal: number;
  wordCountAvg: number;
  charCountTotal: number;
  charCountAvg: number;
  attachmentCountTotal: number;
  attachmentCountAvg: number;
  linkedItemCountTotal: number;
  linkedItemCountAvg: number;
}

export const OBJECTIVE_DOT_METRICS = [
  { key: "tasksTotal", label: "Task count" },
  { key: "tasksCompleted", label: "Tasks completed" },
  { key: "completionPct", label: "Completion %" },
  { key: "wordCountTotal", label: "Word count" },
  { key: "charCountTotal", label: "Char count" },
  { key: "attachmentCountTotal", label: "Proof attachments" },
  { key: "linkedItemCountTotal", label: "Linked items" },
] as const;
export type ObjectiveDotMetricKey = (typeof OBJECTIVE_DOT_METRICS)[number]["key"];

export function objectiveDotMetricValue(
  s: ObjectiveMetricsSnapshot,
  key: ObjectiveDotMetricKey,
): number {
  if (key === "completionPct")
    return s.tasksTotal > 0 ? (s.tasksCompleted / s.tasksTotal) * 100 : 0;
  return s[key];
}

/**
 * One snapshot per objective under the project, as of the most recent
 * available snapshot_date on or before `asOf` — NOT a hard equality match,
 * since snapshot generation can be staggered across objectives/days. An
 * objective with no snapshot row at or before `asOf` is simply absent from
 * the result (see file header — never backfilled as a zero row here).
 */
export async function fetchObjectiveMetricsSnapshot(
  user: XcampUser,
  projectId: string,
  asOf: string,
): Promise<ObjectiveMetricsSnapshot[]> {
  const { data: objectives, error: objErr } = await supabase
    .from("objectives")
    .select("id, title")
    .eq("project_id", projectId)
    .eq("tenant_id", user.tenantId);
  if (objErr) throw objErr;
  if (!objectives?.length) return [];

  const titleById = new Map(
    objectives.map((o) => [o.id as string, (o.title as string) || "Untitled objective"]),
  );
  const objectiveIds = objectives.map((o) => o.id as string);

  const { data, error } = await supabase
    .from("objective_metrics_daily")
    .select(
      "objective_id, snapshot_date, tasks_total, tasks_completed, word_count_total, word_count_avg, char_count_total, char_count_avg, attachment_count_total, attachment_count_avg, linked_item_count_total, linked_item_count_avg",
    )
    .in("objective_id", objectiveIds)
    .eq("tenant_id", user.tenantId)
    .lte("snapshot_date", asOf)
    .order("snapshot_date", { ascending: true });
  if (error) throw error;

  // Latest row per objective wins (rows are ascending, so later overwrites earlier).
  const latestByObjective = new Map<string, ObjectiveMetricsSnapshot>();
  for (const r of data ?? []) {
    const objectiveId = r.objective_id as string;
    latestByObjective.set(objectiveId, {
      objectiveId,
      objectiveTitle: titleById.get(objectiveId) ?? "Untitled objective",
      snapshotDate: r.snapshot_date as string,
      tasksTotal: (r.tasks_total as number) ?? 0,
      tasksCompleted: (r.tasks_completed as number) ?? 0,
      wordCountTotal: (r.word_count_total as number) ?? 0,
      wordCountAvg: (r.word_count_avg as number) ?? 0,
      charCountTotal: (r.char_count_total as number) ?? 0,
      charCountAvg: (r.char_count_avg as number) ?? 0,
      attachmentCountTotal: (r.attachment_count_total as number) ?? 0,
      attachmentCountAvg: (r.attachment_count_avg as number) ?? 0,
      linkedItemCountTotal: (r.linked_item_count_total as number) ?? 0,
      linkedItemCountAvg: (r.linked_item_count_avg as number) ?? 0,
    });
  }

  return [...latestByObjective.values()];
}
