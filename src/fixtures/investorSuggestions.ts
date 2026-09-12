// src/fixtures/investorSuggestions.ts
//
// Investor Project Home's "suggested action items" (session brief revision
// §5 steps 6-7) — distinct from FeedItem's "action_item" kind, which is a
// founder's own task list. These are investor-facing observations about a
// project's reported progress, each offering three response types
// (challenge data / indicate gap / suggest assistance) rather than an
// accept/reject or done/not-done state. P1-only, no production analog —
// same disclaimer as PortfolioDeal.
//
// Only Solari Energy (proj-1, the session brief's walkthrough target) has
// entries — every other project shows an honest empty state, same
// convention as Pitchdeck/Readiness staying gated to proj-1. `subject`
// covers the walkthrough's own requirement of at least one Financial item.
export type SuggestionSubject = "Financial" | "Team" | "Market" | "Product";

export interface InvestorSuggestion {
  id: string;
  projectId: string;
  subject: SuggestionSubject;
  title: string;
  description: string;
}

export const INVESTOR_SUGGESTIONS: InvestorSuggestion[] = [
  {
    id: "sugg-1",
    projectId: "proj-1",
    subject: "Financial",
    title: "Unit economics assumes a 4-year payback, evidence shows 3.5",
    description:
      "The capital-requirement objective models a 4-year hardware payback period, but the underlying unit-economics objective's own proof supports 3.5 years at current BOM cost.",
  },
  {
    id: "sugg-2",
    projectId: "proj-1",
    subject: "Team",
    title: "No named hire against the manufacturing-partner objective",
    description:
      "Securing an ISO 9001 manufacturing partner is marked in progress, but no team member is named as owning the relationship day to day.",
  },
  {
    id: "sugg-3",
    projectId: "proj-1",
    subject: "Market",
    title: "Rural-county survey covers 3 counties, ask references 12-county rollout",
    description:
      "The demand-validation proof is scoped to three Kenyan counties; the capital-requirement objective's 18-month plan assumes results generalize to twelve.",
  },
  {
    id: "sugg-4",
    projectId: "proj-1",
    subject: "Product",
    title: "v2 controller BOM finalized, no field-test data cited yet",
    description:
      "The latest update reports the v2 microgrid controller's bill of materials as finalized, but doesn't yet cite field performance data from a live site.",
  },
];

export function getInvestorSuggestionsByProject(projectId: string): InvestorSuggestion[] {
  return INVESTOR_SUGGESTIONS.filter((s) => s.projectId === projectId);
}
