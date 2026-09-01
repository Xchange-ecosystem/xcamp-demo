// Dimension/category/status filtering for the founder project dashboard's
// timeline + dot plot (Decision 2, CC follow-up to PR #130). `dimension` and
// `category` on `objectives` are free-text fields with real casing drift in
// the live data (e.g. "Operations" and "operations" both occur) — these
// values are grouped case/whitespace-insensitively so they present as one
// filter option instead of two, using a title-cased label for display.
import { supabase } from "@/lib/supabase";
import type { XcampUser } from "@/types/xcamp";

export interface ObjectiveMeta {
  id: string;
  title: string;
  dimension: string | null;
  category: string | null;
  status: string | null;
}

/** All objectives under the project — used to build filter options and to
 * resolve "how many objectives match the current filter" independent of
 * which ones happen to have a snapshot row yet. */
export async function fetchProjectObjectivesMeta(
  user: XcampUser,
  projectId: string,
): Promise<ObjectiveMeta[]> {
  const { data, error } = await supabase
    .from("objectives")
    .select("id, title, dimension, category, status")
    .eq("project_id", projectId)
    .eq("tenant_id", user.tenantId);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    title: (r.title as string) || "Untitled objective",
    dimension: (r.dimension as string | null) ?? null,
    category: (r.category as string | null) ?? null,
    status: (r.status as string | null) ?? null,
  }));
}

function titleCase(s: string): string {
  return s.replace(/\S+/g, (w) => w[0]!.toUpperCase() + w.slice(1).toLowerCase());
}

/** Case/whitespace-insensitive grouping key. Empty string means "no value set". */
export function normalizeKey(raw: string | null | undefined): string {
  return (raw ?? "").trim().toLowerCase();
}

export function displayLabel(key: string): string {
  return key ? titleCase(key) : "Uncategorized";
}

export interface FilterOption {
  key: string;
  label: string;
  count: number;
}

function buildOptions(values: (string | null)[]): FilterOption[] {
  const byKey = new Map<string, number>();
  for (const v of values) {
    const key = normalizeKey(v);
    byKey.set(key, (byKey.get(key) ?? 0) + 1);
  }
  return [...byKey.entries()]
    .map(([key, count]) => ({ key, label: displayLabel(key), count }))
    .sort((a, b) => (a.key === "" ? 1 : b.key === "" ? -1 : b.count - a.count));
}

/** Dimension options across all objectives, most-populous first ("Uncategorized" last). */
export function dimensionOptions(objectives: ObjectiveMeta[]): FilterOption[] {
  return buildOptions(objectives.map((o) => o.dimension));
}

/** Category options — narrowed to the selected dimension when one is picked,
 * per the brief: cascading rather than a flat list of every category across
 * every dimension. */
export function categoryOptions(
  objectives: ObjectiveMeta[],
  dimensionKey: string | null,
): FilterOption[] {
  const scoped =
    dimensionKey === null
      ? objectives
      : objectives.filter((o) => normalizeKey(o.dimension) === dimensionKey);
  return buildOptions(scoped.map((o) => o.category));
}

export interface ObjectiveFilterState {
  dimension: string | null;
  category: string | null;
  status: string | null;
}

export const EMPTY_OBJECTIVE_FILTER: ObjectiveFilterState = {
  dimension: null,
  category: null,
  status: null,
};

export function isFilterActive(filter: ObjectiveFilterState): boolean {
  return filter.dimension !== null || filter.category !== null || filter.status !== null;
}

export function objectiveMatchesFilter(
  o: { dimension: string | null; category: string | null; status: string | null },
  filter: ObjectiveFilterState,
): boolean {
  if (filter.dimension !== null && normalizeKey(o.dimension) !== filter.dimension) return false;
  if (filter.category !== null && normalizeKey(o.category) !== filter.category) return false;
  if (filter.status !== null && (o.status ?? "") !== filter.status) return false;
  return true;
}
