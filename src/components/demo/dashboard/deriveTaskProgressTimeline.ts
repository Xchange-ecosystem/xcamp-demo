// src/components/demo/dashboard/deriveTaskProgressTimeline.ts
//
// Synthetic daily history for the Dashboard's task-progress chart. The
// TASKS fixture (src/fixtures/objectives.ts) is a single current snapshot,
// not a day-by-day history — there's nothing to chart a real timeline from.
// Same idiom as deriveChatSideEffects.ts: authored, deterministic logic over
// real current values, not invented content and no AI call. This walks
// backward from today's REAL TASKS status counts (and the project's real
// qualityPct from src/fixtures/metrics.ts) so the most recent point always
// exactly matches the current snapshot — only the history leading up to it
// is synthesized.
import { TASKS } from "@/fixtures/objectives";
import { getProjectMetrics } from "@/fixtures/metrics";

export type Granularity = "day" | "week" | "month";

export interface TimelinePoint {
  date: string; // ISO date (YYYY-MM-DD), or a week-start / YYYY-MM bucket key once aggregated
  inactive: number; // "Still a sketch"
  active: number; // "Active"
  completed: number; // "Complete"
  quality: number; // 0-100
}

const DAY_MS = 86_400_000;
// Fixed "today" for the demo's fixture world — matches the anchor date
// CompanionInfoPanel already uses for its own due-date urgency logic, so the
// two screens agree on "now" without importing from one another.
const DEMO_TODAY = "2026-09-04T00:00:00Z";

// Deterministic pseudo-random in [0, 1), seeded by an integer — reproducible
// on every load (no Math.random, no wall-clock dependence beyond the fixed
// DEMO_TODAY anchor above).
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Walks backward `days` days from DEMO_TODAY, starting at the project's real
 * current TASKS status counts and real qualityPct, and undoing a little
 * progress at each earlier step (completed -> active, active -> inactive;
 * quality drifting down slightly further back). Returned oldest -> newest,
 * so the LAST point always exactly equals today's real snapshot.
 */
export function generateDailyTaskProgressTimeline(projectId: string, days = 180): TimelinePoint[] {
  const projectTasks = TASKS.filter((t) => t.projectId === projectId);
  const metrics = getProjectMetrics(projectId);

  let completed = projectTasks.filter((t) => t.status === "completed").length;
  let active = projectTasks.filter((t) => t.status === "active").length;
  let inactive = projectTasks.filter((t) => t.status === "inactive").length;
  let quality = metrics?.qualityPct ?? 70;

  const today = new Date(DEMO_TODAY);
  const points: TimelinePoint[] = [];

  for (let i = 0; i <= days; i++) {
    const date = new Date(today.getTime() - i * DAY_MS);
    points.push({
      date: date.toISOString().slice(0, 10),
      inactive,
      active,
      completed,
      quality: Math.round(quality),
    });

    // Step to the NEXT (older) point — undo a little progress the further
    // back we go, floored so counts/quality never go negative or implausibly low.
    if (completed > 0 && seededRandom(i * 7 + 1) < 0.12) {
      completed -= 1;
      active += 1;
    }
    if (active > 0 && seededRandom(i * 7 + 2) < 0.08) {
      active -= 1;
      inactive += 1;
    }
    if (seededRandom(i * 7 + 3) < 0.3) {
      quality = Math.max(40, quality - 1);
    }
  }

  return points.reverse();
}

function bucketKey(dateStr: string, granularity: Granularity): string {
  if (granularity === "day") return dateStr;
  const d = new Date(`${dateStr}T00:00:00Z`);
  if (granularity === "week") {
    const isoDayOffset = (d.getUTCDay() + 6) % 7; // Monday-start week
    const monday = new Date(d.getTime() - isoDayOffset * DAY_MS);
    return monday.toISOString().slice(0, 10);
  }
  return dateStr.slice(0, 7); // YYYY-MM
}

/**
 * Re-aggregates the daily series into week/month buckets by averaging each
 * field per bucket (rounded) — a real transformation of the underlying
 * values, not just a relabeled x-axis. "day" granularity returns the most
 * recent 30 daily points as-is; "week"/"month" return the most recent 12/6
 * buckets computed over the full `daily` series passed in.
 */
export function aggregateTimeline(
  daily: TimelinePoint[],
  granularity: Granularity,
): TimelinePoint[] {
  if (granularity === "day") return daily.slice(-30);

  const buckets = new Map<string, TimelinePoint[]>();
  for (const point of daily) {
    const key = bucketKey(point.date, granularity);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(point);
    else buckets.set(key, [point]);
  }

  const avg = (nums: number[]) => nums.reduce((sum, n) => sum + n, 0) / nums.length;
  const aggregated: TimelinePoint[] = Array.from(buckets.entries()).map(([date, points]) => ({
    date,
    inactive: Math.round(avg(points.map((p) => p.inactive))),
    active: Math.round(avg(points.map((p) => p.active))),
    completed: Math.round(avg(points.map((p) => p.completed))),
    quality: Math.round(avg(points.map((p) => p.quality))),
  }));

  const limit = granularity === "week" ? 12 : 6;
  return aggregated.slice(-limit);
}
