// src/components/demo/companion/buildCompanionContext.ts
//
// Builds the fixture-derived grounding sent to api/companion/chat.ts, scoped
// per persona: Founder gets their own venture's fixtures (unchanged from the
// original Founder-only build); Investor gets whichever project is currently
// active (drilled into from the route), or portfolio-level fixtures when
// they're at the ecosystem level; Collaborator gets their own assignments
// and wallet. Mirrors api/companion/chat.ts's ChatRequestBody['context']
// shape by hand — the serverless function can't import from src/ (same
// constraint noted in that file and in api/recap/extract.ts).
import { DEMO_FOUNDER_PROJECT_ID } from "@/fixtures/pitch";
import { getProjectById } from "@/fixtures/projects";
import { getObjectivesByProject, TASKS } from "@/fixtures/objectives";
import { PEOPLE } from "@/fixtures/people";
import { getPortfolioEntry, getRankedPortfolio } from "@/fixtures/portfolio";
import { getDealByProjectId } from "@/fixtures/investorDeals";
import { ECOSYSTEM_METRICS } from "@/fixtures/metrics";
import { DEMO_COLLABORATOR_ID, getAssignmentsByAssignee } from "@/fixtures/assignments";
import { getWalletBalance } from "@/fixtures/wallet";
import type { DemoPersona } from "@/components/demo/DemoNavRail";

export type CompanionChatContext = Record<string, unknown>;

function founderContext(): CompanionChatContext {
  const project = getProjectById(DEMO_FOUNDER_PROJECT_ID);
  const objectives = getObjectivesByProject(DEMO_FOUNDER_PROJECT_ID).map((o) => ({
    title: o.title,
    description: o.description,
    status: o.status,
    dimension: o.dimension,
  }));
  const tasks = TASKS.filter((t) => t.projectId === DEMO_FOUNDER_PROJECT_ID).map((t) => ({
    title: t.title,
    status: t.status,
    priority: t.priority,
    dueDate: t.dueDate,
  }));
  const people = PEOPLE.filter((p) => p.role === "investor" || p.role === "collaborator").map(
    (p) => ({ displayName: p.displayName, role: p.role, title: p.title }),
  );
  return {
    project: project
      ? { name: project.name, description: project.description, tags: project.tags }
      : undefined,
    objectives,
    tasks,
    people,
  };
}

function portfolioProjectSummary(projectId: string) {
  const project = getProjectById(projectId);
  if (!project) return null;
  const entry = getPortfolioEntry(projectId);
  const deal = getDealByProjectId(projectId);
  return {
    name: project.name,
    description: project.description,
    rank: entry?.rank,
    performanceScore: entry?.performanceScore,
    performanceDeltaPct: entry?.performanceDeltaPct,
    investedAmount: entry?.investedAmount,
    currentValuation: entry?.currentValuation,
    matchPct: deal?.matchPct,
    riskLevel: deal?.riskLevel,
    round: deal?.round,
    askAmount: deal?.askAmount,
    ticketSize: deal?.ticketSize,
  };
}

function investorContext(activeProjectId: string | null): CompanionChatContext {
  if (activeProjectId) {
    return { activeProject: portfolioProjectSummary(activeProjectId) };
  }
  const topProjects = getRankedPortfolio()
    .slice(0, 5)
    .map((entry) => portfolioProjectSummary(entry.projectId))
    .filter((p): p is NonNullable<typeof p> => !!p);
  return {
    topProjects,
    ecosystemMetrics: {
      avgProgressPct: ECOSYSTEM_METRICS.avgProgressPct,
      avgQualityPct: ECOSYSTEM_METRICS.avgQualityPct,
      totalTasksCompleted: ECOSYSTEM_METRICS.totalTasksCompleted,
      activeProjects: ECOSYSTEM_METRICS.activeProjects,
    },
  };
}

function collaboratorContext(): CompanionChatContext {
  const assignments = getAssignmentsByAssignee(DEMO_COLLABORATOR_ID).map((a) => ({
    title: a.title,
    workflowState: a.workflowState,
    valueState: a.valueState,
    value: a.value,
    dueLabel: a.dueLabel,
  }));
  return { assignments, walletBalance: getWalletBalance(DEMO_COLLABORATOR_ID) };
}

/** `activeProjectId` only matters for the investor persona — the project
 *  they're currently drilled into, or `null` at the ecosystem level. */
export function buildCompanionContext(
  persona: DemoPersona,
  activeProjectId: string | null,
): CompanionChatContext {
  if (persona === "investor") return investorContext(activeProjectId);
  if (persona === "collaborator") return collaboratorContext();
  return founderContext();
}
