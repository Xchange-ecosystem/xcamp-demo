// Persona toast template pools for the ambient toast scheduler
// (src/hooks/useAmbientToasts.ts). Ported from the approved Founder Home
// prototype (P1 chat artifact) — content, timing, and randomization logic
// match that prototype closely; only the variable pools were swapped for
// real fixtures where a good fit existed (Phase 0 audit).
import { PEOPLE, PROJECTS, TASKS } from "@/fixtures";

export type AmbientToastKind = "positive" | "change" | "announcement" | "cta";

export interface AmbientToastSpec {
  kind: AmbientToastKind;
  title: string;
  body?: string;
  ctaLabel?: string;
}

export function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function pick<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)];
}

export function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Real fixtures (src/fixtures) — reused instead of standalone mock arrays
// per Phase 0 audit. Admin is excluded: toasts reference founders,
// investors, and collaborators, not the program admin fixture.
const NAMES = PEOPLE.filter((p) => p.role !== "admin").map((p) => p.displayName);
const PROJECT_NAMES = PROJECTS.map((p) => p.name);
const TASK_TITLES = TASKS.map((t) => t.title);

// No dedicated "investor fund" fixture exists yet (Phase 0 audit) — kept
// from the approved prototype as-is. Fjord Ventures already matches the
// real fixture data (src/fixtures/people.ts).
const FUNDS = ["Fjord Ventures", "Antler", "Techstars", "Northgate Capital", "Meridian Seed"];

type Template = () => AmbientToastSpec;

export const AMBIENT_TOAST_TEMPLATES: Record<"founder" | "investor" | "collaborator", Template[]> =
  {
    founder: [
      () => ({ kind: "announcement", title: `${pick(NAMES)} has visited your project.` }),
      () => ({ kind: "positive", title: `${pick(NAMES)} has delivered on their task.` }),
      () => {
        const t = pick(TASK_TITLES);
        const a = pick(NAMES);
        return {
          kind: "cta",
          title: `Task "${t}" is delayed.`,
          body: `You might want to follow up with ${a}.`,
          ctaLabel: "Follow up",
        };
      },
      () => ({
        kind: "announcement",
        title: `${randInt(2, 6)} investors are interested in your project.`,
      }),
      () => ({
        kind: "announcement",
        title: `Your project matches ${randInt(60, 85)}% with the criteria of ${pick(FUNDS)}.`,
      }),
      () => ({
        kind: "cta",
        title: `Our AI found ${randInt(2, 5)} collaborators in the ecosystem who could help.`,
        ctaLabel: "See matches",
      }),
      () => ({
        kind: "cta",
        title: `Our AI has ${randInt(1, 4)} suggested new tasks.`,
        ctaLabel: "Review suggestions",
      }),
      () => ({
        kind: "cta",
        title: `Our AI has ${randInt(1, 3)} suggestions to accelerate your open tasks.`,
        ctaLabel: "See suggestions",
      }),
      () => {
        const a = pick(NAMES);
        const t = pick(TASK_TITLES);
        return { kind: "positive", title: `${a} accepted their assignment on "${t}".` };
      },
      () => ({
        kind: "cta",
        title: `Chi drafted a follow-up for ${pick(NAMES)}.`,
        body: "Review before it sends.",
        ctaLabel: "Review draft",
      }),
      () => ({
        kind: "announcement",
        title: `A new investor, ${pick(NAMES)} from ${pick(FUNDS)}, joined your ecosystem view.`,
      }),
      () => ({
        kind: "positive",
        title: `Your average quality score rose to ${randInt(80, 94)}% this week.`,
      }),
    ],
    investor: [
      () => ({
        kind: "announcement",
        title: `There's been progress on ${randInt(2, 6)} projects in your portfolio.`,
      }),
      () => ({
        kind: "positive",
        title: `${pick(PROJECT_NAMES)} increased its progress by ${randInt(4, 22)}% in the last 7 days.`,
      }),
      () => ({
        kind: "cta",
        title: `${pick(PROJECT_NAMES)} lags behind its time plan.`,
        body: "You might want to check how the ecosystem could support its progress.",
        ctaLabel: "Check project",
      }),
      () => ({
        kind: "cta",
        title: `${randInt(2, 5)} projects match your investment criteria by at least 80%.`,
        ctaLabel: "See matches",
      }),
      () => ({
        kind: "cta",
        title: `${pick(PROJECT_NAMES)} is monitored by ${randInt(3, 12)} other people in the network.`,
        body: "You should check it out.",
        ctaLabel: "View project",
      }),
      () => ({
        kind: "announcement",
        title: `${pick(NAMES)} published a new update on ${pick(PROJECT_NAMES)}.`,
      }),
      () => ({
        kind: "positive",
        title: `${pick(PROJECT_NAMES)} completed an objective — ${randInt(80, 400)} credits settled.`,
      }),
      () => ({
        kind: "announcement",
        title: `${pick(PROJECT_NAMES)} added a new collaborator this week.`,
      }),
      () => ({
        kind: "positive",
        title: `Your portfolio's average quality score is now ${randInt(75, 92)}%.`,
      }),
      () => ({
        kind: "positive",
        title: `${pick(PROJECT_NAMES)} is now fully staffed — every assignment accepted.`,
      }),
    ],
    collaborator: [
      () => ({
        kind: "cta",
        title: `You have ${randInt(1, 4)} new assignments.`,
        ctaLabel: "View assignments",
      }),
      () => ({
        kind: "positive",
        title: `A project you've earned rewards in increased its progress by ${randInt(4, 20)}% in the last 7 days.`,
      }),
      () => ({
        kind: "positive",
        title: `${pick(PROJECT_NAMES)} certified your last evaluation — badge earned.`,
      }),
      () => ({
        kind: "positive",
        title: `You're on track to earn ${randInt(40, 220)} credits this month.`,
      }),
      () => ({
        kind: "announcement",
        title: `${pick(NAMES)} left a note on your task "${pick(TASK_TITLES)}".`,
      }),
      () => ({
        kind: "cta",
        title: `A new task matching your skills opened in ${pick(PROJECT_NAMES)}.`,
        ctaLabel: "View task",
      }),
      () => ({ kind: "positive", title: `Your proof for "${pick(TASK_TITLES)}" was accepted.` }),
    ],
  };
