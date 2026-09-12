import type { NetworkEdge, NetworkNode } from "./types";
import { PEOPLE } from "./people";
import { PROJECTS } from "./projects";
import { ECOSYSTEMS, getEcosystemIdForPerson, getEcosystemIdForProject } from "./ecosystems";
import { getObjectivesByProject, getTasksByProject } from "./objectives";

// Ecosystem Navigator's network canvas, at the "Ecosystem" altitude (one
// ecosystem's people + projects). Nodes are derived from PEOPLE/PROJECTS —
// every refId resolves to a real fixture row, no orphaned references.
export const NETWORK_NODES: NetworkNode[] = [
  ...PEOPLE.map((person): NetworkNode => ({
    id: `node-person-${person.id}`,
    kind: "person",
    ecosystemId: getEcosystemIdForPerson(person.id),
    refId: person.id,
  })),
  ...PROJECTS.map((project): NetworkNode => ({
    id: `node-project-${project.id}`,
    kind: "project",
    ecosystemId: getEcosystemIdForProject(project.id),
    refId: project.id,
  })),
];

// Cross-connections between nodes — decorative only, per the session
// brief ("no defined semantic meaning needed... just enough visual density
// to look like a live network"). A handful follow real fixture
// relationships anyway (founder -> own project, collaborator -> a project
// they're assigned tasks on) simply because those made obvious, free
// choices; the rest (investor -> project, person -> person) are authored
// for density and are not meant to be read as literal deal/reporting lines.
const EDGE_PAIRS: [string, string][] = [
  // Founders -> their own projects
  ["node-person-person-1", "node-project-proj-1"],
  ["node-person-person-1", "node-project-proj-2"],
  ["node-person-person-2", "node-project-proj-3"],
  ["node-person-person-2", "node-project-proj-4"],
  ["node-person-person-3", "node-project-proj-5"],
  ["node-person-person-3", "node-project-proj-6"],
  ["node-person-person-4", "node-project-proj-7"],
  ["node-person-person-4", "node-project-proj-8"],
  ["node-person-person-13", "node-project-proj-9"],
  ["node-person-person-14", "node-project-proj-10"],
  // Collaborators -> a project they're active on
  ["node-person-person-7", "node-project-proj-1"],
  ["node-person-person-11", "node-project-proj-2"],
  ["node-person-person-8", "node-project-proj-3"],
  ["node-person-person-9", "node-project-proj-5"],
  ["node-person-person-10", "node-project-proj-7"],
  // Investors -> projects in their dealflow/portfolio
  ["node-person-person-5", "node-project-proj-1"],
  ["node-person-person-5", "node-project-proj-5"],
  ["node-person-person-6", "node-project-proj-3"],
  ["node-person-person-6", "node-project-proj-8"],
  // Person <-> person (mentorship, co-investing, cross-project overlap)
  ["node-person-person-1", "node-person-person-5"],
  ["node-person-person-2", "node-person-person-6"],
  ["node-person-person-7", "node-person-person-8"],
  ["node-person-person-9", "node-person-person-10"],
  ["node-person-person-12", "node-person-person-1"],
  ["node-person-person-12", "node-person-person-4"],
  ["node-person-person-5", "node-person-person-6"],
  ["node-person-person-13", "node-person-person-1"],
  ["node-person-person-14", "node-person-person-4"],
];

export const NETWORK_EDGES: NetworkEdge[] = EDGE_PAIRS.map(([sourceId, targetId], i) => ({
  id: `edge-${i + 1}`,
  sourceId,
  targetId,
}));

// Ecosphere altitude: ecosystems themselves as nodes, connected to each
// other — a full triangle across the 3 ecosystems, decorative.
export const ECOSYSTEM_EDGES: NetworkEdge[] = [
  { id: "eco-edge-1", sourceId: "eco-1", targetId: "eco-2" },
  { id: "eco-edge-2", sourceId: "eco-2", targetId: "eco-3" },
  { id: "eco-edge-3", sourceId: "eco-1", targetId: "eco-3" },
];

export function getNodesByEcosystem(ecosystemId: string): NetworkNode[] {
  return NETWORK_NODES.filter((n) => n.ecosystemId === ecosystemId);
}

export function getEdgesForNodes(nodeIds: Set<string>): NetworkEdge[] {
  return NETWORK_EDGES.filter((e) => nodeIds.has(e.sourceId) && nodeIds.has(e.targetId));
}

export function getEcosystemNetwork(ecosystemId: string) {
  const nodes = getNodesByEcosystem(ecosystemId);
  const nodeIds = new Set(nodes.map((n) => n.id));
  return { nodes, edges: getEdgesForNodes(nodeIds) };
}

export function getEcosphereNetwork() {
  return { ecosystems: ECOSYSTEMS, edges: ECOSYSTEM_EDGES };
}

/** Project altitude: "users, goals, and cross-connections scoped to one
 *  project" (session brief §3). Reuses the existing Objectives/Tasks
 *  fixtures as goal/assignment data rather than authoring a parallel
 *  dataset — a task's assignee is a real cross-connection to a real goal
 *  (its objective), so this altitude is the one place these edges aren't
 *  purely decorative. */
export interface ProjectAltitudeNode {
  id: string;
  kind: "person" | "goal";
  refId: string;
}

export function getProjectAltitudeNetwork(projectId: string) {
  const objectives = getObjectivesByProject(projectId);
  const tasks = getTasksByProject(projectId);
  const project = PROJECTS.find((p) => p.id === projectId);

  const personIds = new Set<string>();
  if (project) personIds.add(project.ownerId);
  for (const task of tasks) {
    if (task.assigneeId) personIds.add(task.assigneeId);
  }

  const nodes: ProjectAltitudeNode[] = [
    ...[...personIds].map((id) => ({
      id: `node-person-${id}`,
      kind: "person" as const,
      refId: id,
    })),
    ...objectives.map((o) => ({ id: `node-goal-${o.id}`, kind: "goal" as const, refId: o.id })),
  ];

  const edges: NetworkEdge[] = [];
  let edgeIndex = 0;
  for (const task of tasks) {
    if (!task.assigneeId) continue;
    edges.push({
      id: `proj-edge-${edgeIndex++}`,
      sourceId: `node-person-${task.assigneeId}`,
      targetId: `node-goal-${task.objectiveId}`,
    });
  }

  return { nodes, edges };
}
