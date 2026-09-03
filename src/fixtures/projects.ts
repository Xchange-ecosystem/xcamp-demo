import type { Project } from "./types";

// 8 projects, owned by the 4 founder fixtures (2 each) — enough spread for
// the Investor/Operator ranked list and Portfolio selector to look like a
// real portfolio rather than a 2-3 item stub.
export const PROJECTS: Project[] = [
  {
    id: "proj-1",
    name: "Solari Energy",
    description: "Modular solar microgrids for off-grid rural communities.",
    color: "#f59e0b",
    featureImage: null,
    status: "active",
    tags: ["climate", "hardware"],
    ownerId: "person-1",
    updatedAt: "2026-09-01T10:00:00.000Z",
  },
  {
    id: "proj-2",
    name: "Solari Storage",
    description: "Second-life battery storage packs built from Solari's own returns.",
    color: "#d97706",
    featureImage: null,
    status: "active",
    tags: ["climate", "hardware"],
    ownerId: "person-1",
    updatedAt: "2026-08-28T15:30:00.000Z",
  },
  {
    id: "proj-3",
    name: "Fernbase",
    description: "Developer platform for deploying edge ML models on low-power devices.",
    color: "#22b8b0",
    featureImage: null,
    status: "active",
    tags: ["devtools", "AI"],
    ownerId: "person-2",
    updatedAt: "2026-09-02T09:15:00.000Z",
  },
  {
    id: "proj-4",
    name: "Fernbase Studio",
    description: "Visual model-pipeline builder on top of the Fernbase runtime.",
    color: "#0891b2",
    featureImage: null,
    status: "paused",
    tags: ["devtools", "AI"],
    ownerId: "person-2",
    updatedAt: "2026-08-15T12:00:00.000Z",
  },
  {
    id: "proj-5",
    name: "Loopwell Health",
    description: "Continuous glucose monitoring paired with an AI coaching companion.",
    color: "#e11d48",
    featureImage: null,
    status: "active",
    tags: ["health", "AI"],
    ownerId: "person-3",
    updatedAt: "2026-09-03T08:00:00.000Z",
  },
  {
    id: "proj-6",
    name: "Loopwell Clinics",
    description: "Clinic-facing dashboard for care teams using Loopwell data.",
    color: "#be123c",
    featureImage: null,
    status: "active",
    tags: ["health"],
    ownerId: "person-3",
    updatedAt: "2026-08-30T17:45:00.000Z",
  },
  {
    id: "proj-7",
    name: "Northlight Robotics",
    description: "Autonomous inspection drones for offshore wind farms.",
    color: "#6d28d9",
    featureImage: null,
    status: "active",
    tags: ["climate", "robotics"],
    ownerId: "person-4",
    updatedAt: "2026-08-25T11:20:00.000Z",
  },
  {
    id: "proj-8",
    name: "Northlight Fleet",
    description: "Fleet-management SaaS layer for Northlight's drone hardware customers.",
    color: "#7c3aed",
    featureImage: null,
    status: "completed",
    tags: ["climate", "robotics", "SaaS"],
    ownerId: "person-4",
    updatedAt: "2026-07-20T14:10:00.000Z",
  },
];

export function getProjectById(id: string): Project | undefined {
  return PROJECTS.find((p) => p.id === id);
}

export function getProjectsByOwner(ownerId: string): Project[] {
  return PROJECTS.filter((p) => p.ownerId === ownerId);
}
