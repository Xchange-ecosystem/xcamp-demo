import { getProjectsByOwner, getTasksByAssignee, type Person } from "@/fixtures";

// Display-only derived counts for a person's Grid View tile / network node —
// same purpose as the real app's mockContributionCountForUser
// (src/lib/ecosystemNavigatorMock.ts), computed from fixtures here instead
// of invented, since the fixture layer already has the underlying rows.
export function projectCountForPerson(personId: string): number {
  const owned = getProjectsByOwner(personId).length;
  const assignedProjectIds = new Set(getTasksByAssignee(personId).map((t) => t.projectId));
  return owned + assignedProjectIds.size;
}

export function contributionCountForPerson(personId: string): number {
  return getTasksByAssignee(personId).length;
}

export function tagsForPerson(person: Person): string[] {
  const tags = new Set<string>();
  for (const project of getProjectsByOwner(person.id)) {
    for (const tag of project.tags) tags.add(tag);
  }
  return [...tags].slice(0, 3);
}

// Radial layout — same technique as NavigatorGraph.tsx's radialPos, generalized
// to N concentric rings instead of one project + two rings, since the
// Ecosystem Navigator's node sets vary in shape per altitude (ecosystems only;
// projects + people; goals + people).
export interface RadialRing<T> {
  items: T[];
  radius: number;
}

export function radialLayout<T>(
  rings: RadialRing<T>[],
  getId: (item: T) => string,
  cx = 400,
  cy = 300,
): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};
  for (const ring of rings) {
    const total = ring.items.length;
    ring.items.forEach((item, i) => {
      if (total === 0) return;
      const angle = (2 * Math.PI * i) / total - Math.PI / 2;
      positions[getId(item)] = {
        x: cx + ring.radius * Math.cos(angle),
        y: cy + ring.radius * Math.sin(angle),
      };
    });
  }
  return positions;
}

export function getObjectiveStatusColor(status: string): string {
  switch (status) {
    case "in_progress":
      return "var(--skin-accent)";
    case "done":
      return "#22c55e";
    case "suggested":
      return "var(--skin-ink-faint)";
    default:
      return "var(--skin-ink-soft)";
  }
}
