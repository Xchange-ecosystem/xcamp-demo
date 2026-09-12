import type { Person } from "./types";

// 14 people across all four personas — enough for multiple collaborators
// per project without every project sharing the exact same roster.
// person-13/person-14 were added for the Investor/Operator showcase
// session as owners of proj-9/proj-10.
export const PEOPLE: Person[] = [
  {
    id: "person-1",
    displayName: "Maren Solberg",
    avatarUrl: null,
    role: "founder",
    title: "Founder, Solari Energy",
    email: "maren@solari.example",
  },
  {
    id: "person-2",
    displayName: "Devon Achebe",
    avatarUrl: null,
    role: "founder",
    title: "Founder, Fernbase",
    email: "devon@fernbase.example",
  },
  {
    id: "person-3",
    displayName: "Priya Nandakumar",
    avatarUrl: null,
    role: "founder",
    title: "Founder, Loopwell Health",
    email: "priya@loopwell.example",
  },
  {
    id: "person-4",
    displayName: "Tomas Reyes",
    avatarUrl: null,
    role: "founder",
    title: "Founder, Northlight Robotics",
    email: "tomas@northlight.example",
  },
  {
    id: "person-5",
    displayName: "Ingrid Halvorsen",
    avatarUrl: null,
    role: "investor",
    title: "Partner, Fjord Ventures",
    email: "ingrid@fjordvc.example",
  },
  {
    id: "person-6",
    displayName: "Marcus Webb",
    avatarUrl: null,
    role: "investor",
    title: "Operating Partner, Fjord Ventures",
    email: "marcus@fjordvc.example",
  },
  {
    id: "person-7",
    displayName: "Elena Vasquez",
    avatarUrl: null,
    role: "collaborator",
    title: "Product Designer",
    email: "elena@collabs.example",
  },
  {
    id: "person-8",
    displayName: "Kwame Boateng",
    avatarUrl: null,
    role: "collaborator",
    title: "Growth Marketer",
    email: "kwame@collabs.example",
  },
  {
    id: "person-9",
    displayName: "Yuki Tanaka",
    avatarUrl: null,
    role: "collaborator",
    title: "Backend Engineer",
    email: "yuki@collabs.example",
  },
  {
    id: "person-10",
    displayName: "Sofia Lindqvist",
    avatarUrl: null,
    role: "collaborator",
    title: "Data Analyst",
    email: "sofia@collabs.example",
  },
  {
    id: "person-11",
    displayName: "Ben Okafor",
    avatarUrl: null,
    role: "collaborator",
    title: "Community Lead",
    email: "ben@collabs.example",
  },
  {
    id: "person-12",
    displayName: "Priya Admin",
    avatarUrl: null,
    role: "admin",
    title: "Program Admin, Xcamp",
    email: "admin@xcamp.example",
  },
  {
    id: "person-13",
    displayName: "Astrid Lund",
    avatarUrl: null,
    role: "founder",
    title: "Founder, Verdant Foods",
    email: "astrid@verdant.example",
  },
  {
    id: "person-14",
    displayName: "Rui Cabral",
    avatarUrl: null,
    role: "founder",
    title: "Founder, Aurex Robotics",
    email: "rui@aurex.example",
  },
];

export function getPersonById(id: string): Person | undefined {
  return PEOPLE.find((p) => p.id === id);
}

export function getPeopleByRole(role: Person["role"]): Person[] {
  return PEOPLE.filter((p) => p.role === role);
}
