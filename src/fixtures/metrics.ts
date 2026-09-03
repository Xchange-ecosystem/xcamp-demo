import type { EcosystemMetrics, ProjectMetricsEntry } from "./types";
import { PROJECTS } from "./projects";
import { PEOPLE } from "./people";
import { OBJECTIVES, TASKS } from "./objectives";

export const PROJECT_METRICS: ProjectMetricsEntry[] = [
  { projectId: "proj-1", progressPct: 62, qualityPct: 88, proofTotal: 41, proofAvgPerTask: 3.1, collaboratorsCount: 5, viewersCount: 3 },
  { projectId: "proj-2", progressPct: 38, qualityPct: 81, proofTotal: 19, proofAvgPerTask: 2.4, collaboratorsCount: 3, viewersCount: 2 },
  { projectId: "proj-3", progressPct: 71, qualityPct: 93, proofTotal: 57, proofAvgPerTask: 3.8, collaboratorsCount: 6, viewersCount: 5 },
  { projectId: "proj-4", progressPct: 22, qualityPct: 76, proofTotal: 9, proofAvgPerTask: 1.8, collaboratorsCount: 2, viewersCount: 1 },
  { projectId: "proj-5", progressPct: 79, qualityPct: 91, proofTotal: 64, proofAvgPerTask: 4.2, collaboratorsCount: 7, viewersCount: 6 },
  { projectId: "proj-6", progressPct: 45, qualityPct: 84, proofTotal: 26, proofAvgPerTask: 2.7, collaboratorsCount: 4, viewersCount: 3 },
  { projectId: "proj-7", progressPct: 68, qualityPct: 87, proofTotal: 49, proofAvgPerTask: 3.5, collaboratorsCount: 5, viewersCount: 4 },
  { projectId: "proj-8", progressPct: 100, qualityPct: 95, proofTotal: 72, proofAvgPerTask: 3.9, collaboratorsCount: 4, viewersCount: 8 },
];

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
