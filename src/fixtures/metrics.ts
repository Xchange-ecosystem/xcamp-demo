import type { EcosystemMetrics, ProjectMetricsEntry } from "./types";
import { PROJECTS } from "./projects";
import { PEOPLE } from "./people";
import { OBJECTIVES, TASKS } from "./objectives";

// Three of this row's seven fields are counts of things the fixture layer
// already holds, so they are computed here rather than hand-authored — the
// authored literals had drifted badly (proj-1 claimed 41 filed proofs
// against 54 actually on its objectives, and 5 collaborators against 3
// people actually assigned to its tasks), and a screen showing a number no
// other screen can reproduce is the failure mode this whole fixture layer
// exists to avoid. Only the fields with no fixture-side source stay
// authored below.
//
//   proofTotal        = sum of Objective.proofCount for the project
//   collaboratorsCount = distinct non-owner Task.assigneeId for the project
//   proofAvgPerTask   = proofTotal / task count, to one decimal
//
// The owner is excluded from collaboratorsCount because the field counts
// collaborators, and a founder assigned to a task on their own project
// (person-1 on task-5, person-2 on task-15, person-3, person-4) is not one.
// Every founder-role assignee in the fixture is the owner of the project
// they are assigned on, so "non-owner" and "non-founder" pick out the same
// people today; owner-exclusion is the rule because ownerId is the field
// that actually says whose project it is.
interface ProjectMetricsSeed {
  projectId: string;
  progressPct: number;
  qualityPct: number;
  viewersCount: number;
}

const PROJECT_METRICS_SEEDS: ProjectMetricsSeed[] = [
  {
    projectId: "proj-1",
    progressPct: 62,
    qualityPct: 88,
    viewersCount: 3,
  },
  {
    projectId: "proj-2",
    progressPct: 38,
    qualityPct: 81,
    viewersCount: 2,
  },
  {
    projectId: "proj-3",
    progressPct: 71,
    qualityPct: 93,
    viewersCount: 5,
  },
  {
    projectId: "proj-4",
    progressPct: 22,
    qualityPct: 76,
    viewersCount: 1,
  },
  {
    projectId: "proj-5",
    progressPct: 79,
    qualityPct: 91,
    viewersCount: 6,
  },
  {
    projectId: "proj-6",
    progressPct: 45,
    qualityPct: 84,
    viewersCount: 3,
  },
  {
    projectId: "proj-7",
    progressPct: 68,
    qualityPct: 87,
    viewersCount: 4,
  },
  {
    projectId: "proj-8",
    progressPct: 100,
    qualityPct: 95,
    viewersCount: 8,
  },
];

function buildProjectMetrics(): ProjectMetricsEntry[] {
  return PROJECT_METRICS_SEEDS.map((seed) => {
    const project = PROJECTS.find((p) => p.id === seed.projectId);
    const objectives = OBJECTIVES.filter((o) => o.projectId === seed.projectId);
    const tasks = TASKS.filter((t) => t.projectId === seed.projectId);
    const proofTotal = objectives.reduce((sum, o) => sum + o.proofCount, 0);
    const collaborators = new Set(
      tasks
        .map((t) => t.assigneeId)
        .filter((id): id is string => id !== null && id !== project?.ownerId),
    );
    return {
      ...seed,
      proofTotal,
      proofAvgPerTask: tasks.length === 0 ? 0 : Number((proofTotal / tasks.length).toFixed(1)),
      collaboratorsCount: collaborators.size,
    };
  });
}

export const PROJECT_METRICS: ProjectMetricsEntry[] = buildProjectMetrics();

export function getProjectMetrics(projectId: string): ProjectMetricsEntry | undefined {
  return PROJECT_METRICS.find((m) => m.projectId === projectId);
}

// Derived from the fixture data itself so it never drifts out of sync with
// PROJECTS/PEOPLE/OBJECTIVES/TASKS as those grow.
export const ECOSYSTEM_METRICS: EcosystemMetrics = {
  totalProjects: PROJECTS.length,
  activeProjects: PROJECTS.filter((p) => p.status === "active").length,
  totalPeople: PEOPLE.length,
  totalObjectives: OBJECTIVES.length,
  totalTasksCompleted: TASKS.filter((t) => t.done).length,
  avgProgressPct: Math.round(
    PROJECT_METRICS.reduce((sum, m) => sum + m.progressPct, 0) / PROJECT_METRICS.length,
  ),
  avgQualityPct: Math.round(
    PROJECT_METRICS.reduce((sum, m) => sum + m.qualityPct, 0) / PROJECT_METRICS.length,
  ),
};
