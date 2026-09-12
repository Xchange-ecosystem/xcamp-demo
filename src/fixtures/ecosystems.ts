import type { Ecosystem } from "./types";
import { PROJECTS } from "./projects";
import { INVESTOR_DEALS } from "./investorDeals";

// 3 ecosystems for the Ecosystem Navigator's Ecosphere altitude (top-level
// nodes) and the investor nav's Ecosystem/Project switcher. proj-1..8
// predate this concept (added for the Founder/Investor P1 screens before
// ecosystems existed as an idea) — assigned to one below rather than left
// ecosystem-less, via PROJECT_ECOSYSTEM, so every screen that groups by
// ecosystem has something real to group by.
export const ECOSYSTEMS: Ecosystem[] = [
  {
    id: "eco-1",
    name: "Nordic Climate Cohort",
    description: "Hardware-heavy climate and energy startups incubated out of Oslo and Copenhagen.",
    color: "#22b8b0",
    region: "Nordics",
  },
  {
    id: "eco-2",
    name: "Berlin Health & AI",
    description: "Health-tech and applied-AI ventures graduating from the Berlin program.",
    color: "#e11d48",
    region: "DACH",
  },
  {
    id: "eco-3",
    name: "Lisbon Frontier Robotics",
    description: "Robotics and deep-tech founders building out of the Lisbon robotics track.",
    color: "#7c3aed",
    region: "Iberia",
  },
];

const PROJECT_ECOSYSTEM: Record<string, string> = {
  "proj-1": "eco-1",
  "proj-2": "eco-1",
  "proj-3": "eco-2",
  "proj-4": "eco-2",
  "proj-5": "eco-2",
  "proj-6": "eco-2",
  "proj-7": "eco-3",
  "proj-8": "eco-3",
  "proj-9": "eco-1",
  "proj-10": "eco-3",
};

// Person -> ecosystem "home" for the Navigator's grid/network views. Not
// modeled as a Person field: an investor or admin can be connected into
// more than one ecosystem (see network.ts's cross-ecosystem edges), so a
// single home ecosystem is only what decides which Ecosystem-altitude
// canvas a person's node first appears on.
const PERSON_ECOSYSTEM: Record<string, string> = {
  "person-1": "eco-1",
  "person-2": "eco-2",
  "person-3": "eco-2",
  "person-4": "eco-3",
  "person-5": "eco-1",
  "person-6": "eco-2",
  "person-7": "eco-1",
  "person-8": "eco-2",
  "person-9": "eco-2",
  "person-10": "eco-3",
  "person-11": "eco-1",
  "person-12": "eco-1",
  "person-13": "eco-1",
  "person-14": "eco-3",
};

export function getEcosystemById(id: string): Ecosystem | undefined {
  return ECOSYSTEMS.find((e) => e.id === id);
}

export function getEcosystemIdForProject(projectId: string): string {
  return PROJECT_ECOSYSTEM[projectId] ?? "eco-1";
}

export function getEcosystemIdForPerson(personId: string): string {
  return PERSON_ECOSYSTEM[personId] ?? "eco-1";
}

export function getProjectsByEcosystem(ecosystemId: string) {
  return PROJECTS.filter((p) => getEcosystemIdForProject(p.id) === ecosystemId);
}

/** Ecosphere altitude's hover-card metrics — derived from PROJECTS +
 *  INVESTOR_DEALS rather than hand-authored, per the fixture layer's
 *  derived-vs-authored rule (see README.md). */
export interface EcosystemHoverMetrics {
  projectCount: number;
  activeProjectCount: number;
  totalAskAmount: number;
  avgMatchPct: number;
}

export function getEcosystemHoverMetrics(ecosystemId: string): EcosystemHoverMetrics {
  const projects = getProjectsByEcosystem(ecosystemId);
  const deals = projects
    .map((p) => INVESTOR_DEALS.find((d) => d.projectId === p.id))
    .filter((d): d is (typeof INVESTOR_DEALS)[number] => !!d);
  return {
    projectCount: projects.length,
    activeProjectCount: projects.filter((p) => p.status === "active").length,
    totalAskAmount: deals.reduce((sum, d) => sum + d.askAmount, 0),
    avgMatchPct: deals.length
      ? Math.round(deals.reduce((sum, d) => sum + d.matchPct, 0) / deals.length)
      : 0,
  };
}
