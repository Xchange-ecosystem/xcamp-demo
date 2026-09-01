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
  dimension: string | null;
  category: string | null;
  status: string | null;
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

// Fabian-confirmed switcher (CC follow-up to PR #130): all four of these are
// selectable, defaulting to task count — it's the one metric with real
// spread in the data today; completions/proof are still near-zero and would
// render as flat lines until usage picks up. Word/proof/linked-item counts
// use the per-task average rather than the objective total: the total
// mostly just re-expresses task count (more tasks -> more words/attachments/
// links), while the average is the more distinct per-objective signal.
export const OBJECTIVE_DOT_METRICS = [
  { key: "tasksTotal", label: "Task count" },
  { key: "wordCountAvg", label: "Word count (avg/task)" },
  { key: "attachmentCountAvg", label: "Proof attachments (avg/task)" },
  { key: "linkedItemCountAvg", label: "Linked items (avg/task)" },
] as const;
export type ObjectiveDotMetricKey = (typeof OBJECTIVE_DOT_METRICS)[number]["key"];

export function objectiveDotMetricValue(
  s: ObjectiveMetricsSnapshot,
  key: ObjectiveDotMetricKey,
): number {
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
    .select("id, title, dimension, category, status")
    .eq("project_id", projectId)
    .eq("tenant_id", user.tenantId);
  if (objErr) throw objErr;
  if (!objectives?.length) return [];

  const metaById = new Map(
    objectives.map((o) => [
      o.id as string,
      {
        title: (o.title as string) || "Untitled objective",
        dimension: (o.dimension as string | null) ?? null,
        category: (o.category as string | null) ?? null,
        status: (o.status as string | null) ?? null,
      },
    ]),
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
    const meta = metaById.get(objectiveId);
    latestByObjective.set(objectiveId, {
      objectiveId,
      objectiveTitle: meta?.title ?? "Untitled objective",
      dimension: meta?.dimension ?? null,
      category: meta?.category ?? null,
      status: meta?.status ?? null,
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

/**
 * Timeline rows re-aggregated from per-objective daily snapshots, scoped to
 * a filtered set of objective ids (Decision 2: dimension/category/status
 * filters apply to the timeline too, not just the dot plot). `project_metrics_daily`
 * has no per-objective breakdown to filter by, so when a filter is active we
 * roll this up client-side from `objective_metrics_daily` instead of reading
 * the pre-aggregated table. Unfiltered, `fetchProjectMetricsTimeline` above
 * is used instead — it's the real backend-computed aggregate and cheaper.
 *
 * `objectivesCompleted` here uses each objective's *current* status (there's
 * no daily-versioned status to read) — the same simplification
 * `fetchProjectDashboardMetrics` already makes for the non-timeline totals.
 * Per-objective averages divide by the count of filtered objectives that
 * have a row on that date, consistent with this file's "absent row is not a
 * zero" rule.
 */
export async function fetchFilteredObjectiveMetricsTimeline(
  user: XcampUser,
  objectives: { id: string; status: string | null }[],
  range: { from: string; to: string },
): Promise<ProjectMetricsSnapshot[]> {
  const objectiveIds = objectives.map((o) => o.id);
  if (!objectiveIds.length) return [];
  const completedById = new Map(objectives.map((o) => [o.id, o.status === "completed"]));

  const { data, error } = await supabase
    .from("objective_metrics_daily")
    .select(
      "objective_id, snapshot_date, tasks_total, tasks_completed, attachment_count_total, linked_item_count_total",
    )
    .in("objective_id", objectiveIds)
    .eq("tenant_id", user.tenantId)
    .gte("snapshot_date", range.from)
    .lte("snapshot_date", range.to)
    .order("snapshot_date", { ascending: true });
  if (error) throw error;

  interface Accum {
    objectiveIds: Set<string>;
    objectivesCompleted: number;
    tasksTotal: number;
    tasksCompletedTotal: number;
    attachmentCountTotal: number;
    linkedItemCountTotal: number;
  }
  const byDate = new Map<string, Accum>();
  for (const r of data ?? []) {
    const date = r.snapshot_date as string;
    const objectiveId = r.objective_id as string;
    const acc = byDate.get(date) ?? {
      objectiveIds: new Set<string>(),
      objectivesCompleted: 0,
      tasksTotal: 0,
      tasksCompletedTotal: 0,
      attachmentCountTotal: 0,
      linkedItemCountTotal: 0,
    };
    acc.objectiveIds.add(objectiveId);
    if (completedById.get(objectiveId)) acc.objectivesCompleted += 1;
    acc.tasksTotal += (r.tasks_total as number) ?? 0;
    acc.tasksCompletedTotal += (r.tasks_completed as number) ?? 0;
    acc.attachmentCountTotal += (r.attachment_count_total as number) ?? 0;
    acc.linkedItemCountTotal += (r.linked_item_count_total as number) ?? 0;
    byDate.set(date, acc);
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([snapshotDate, acc]) => {
      const n = acc.objectiveIds.size || 1;
      return {
        snapshotDate,
        objectivesTotal: acc.objectiveIds.size,
        objectivesCompleted: acc.objectivesCompleted,
        tasksTotal: acc.tasksTotal,
        tasksAvgPerObjective: acc.tasksTotal / n,
        tasksCompletedTotal: acc.tasksCompletedTotal,
        tasksCompletedAvgPerObjective: acc.tasksCompletedTotal / n,
        attachmentCountTotal: acc.attachmentCountTotal,
        attachmentCountAvgPerObjective: acc.attachmentCountTotal / n,
        linkedItemCountTotal: acc.linkedItemCountTotal,
        linkedItemCountAvgPerObjective: acc.linkedItemCountTotal / n,
      };
    });
}
