import type { PortfolioDeal } from "./types";

// One entry per Project (proj-1..proj-15) — the Investor Portfolio View's
// filter/label dataset (see the session brief's filter table and tab
// table). Authored directly, not derived: there's no underlying series to
// compute matchPct/risk/round/ask/ticket from, same as
// ProjectMetricsEntry.progressPct/qualityPct. Deliberately spread across
// the full range of every filter, and evenly across every label (3 projects
// each, no unlabeled ones — the brief's own "All" tab already means "no
// label filter", not "only unlabeled", so nothing needs to sit unlabeled)
// so every tab and every filter combination in the Portfolio View reads as
// a real dealflow rather than a 1-2 item stub. Solari Energy (proj-1) is
// deliberately in Access — the session brief's walkthrough drills into it
// from that tab specifically — and deliberately given riskLevel 2 (within
// dealHelpers' default risk-range filter [2,4]) so it's visible under
// Access on first load, without the investor having to touch the filter
// accordion first.
export const INVESTOR_DEALS: PortfolioDeal[] = [
  {
    projectId: "proj-1",
    matchPct: 92,
    riskLevel: 2,
    clubDealInvestors: 3,
    round: "series-a",
    askAmount: 1_200_000,
    ticketSize: 150_000,
    label: "access",
  },
  {
    projectId: "proj-2",
    matchPct: 58,
    riskLevel: 3,
    clubDealInvestors: 0,
    round: "seed",
    askAmount: 350_000,
    ticketSize: 40_000,
    label: "watchlist",
  },
  {
    projectId: "proj-3",
    matchPct: 81,
    riskLevel: 2,
    clubDealInvestors: 5,
    round: "series-b",
    askAmount: 3_000_000,
    ticketSize: 300_000,
    label: "dealflow",
  },
  {
    projectId: "proj-4",
    matchPct: 35,
    riskLevel: 4,
    clubDealInvestors: 1,
    round: "pre-seed",
    askAmount: 150_000,
    ticketSize: 25_000,
    label: "dealflow",
  },
  {
    projectId: "proj-5",
    matchPct: 88,
    riskLevel: 2,
    clubDealInvestors: 2,
    round: "series-a",
    askAmount: 2_000_000,
    ticketSize: 200_000,
    label: "access",
  },
  {
    projectId: "proj-6",
    matchPct: 64,
    riskLevel: 3,
    clubDealInvestors: 0,
    round: "seed",
    askAmount: 500_000,
    ticketSize: 60_000,
    label: "shortlist",
  },
  {
    projectId: "proj-7",
    matchPct: 47,
    riskLevel: 5,
    clubDealInvestors: 1,
    round: "series-b",
    askAmount: 4_000_000,
    ticketSize: 400_000,
    label: "watchlist",
  },
  {
    projectId: "proj-8",
    matchPct: 73,
    riskLevel: 3,
    clubDealInvestors: 4,
    round: "series-c-plus",
    askAmount: 5_000_000,
    ticketSize: 500_000,
    label: "invested",
  },
  {
    projectId: "proj-9",
    matchPct: 55,
    riskLevel: 3,
    clubDealInvestors: 2,
    round: "pre-seed",
    askAmount: 250_000,
    ticketSize: 50_000,
    label: "invested",
  },
  {
    projectId: "proj-10",
    matchPct: 69,
    riskLevel: 4,
    clubDealInvestors: 0,
    round: "seed",
    askAmount: 800_000,
    ticketSize: 100_000,
    label: "shortlist",
  },
  {
    projectId: "proj-11",
    matchPct: 61,
    riskLevel: 3,
    clubDealInvestors: 1,
    round: "seed",
    askAmount: 600_000,
    ticketSize: 70_000,
    label: "watchlist",
  },
  {
    projectId: "proj-12",
    matchPct: 72,
    riskLevel: 3,
    clubDealInvestors: 2,
    round: "series-a",
    askAmount: 1_500_000,
    ticketSize: 180_000,
    label: "shortlist",
  },
  {
    projectId: "proj-13",
    matchPct: 84,
    riskLevel: 2,
    clubDealInvestors: 3,
    round: "series-a",
    askAmount: 1_800_000,
    ticketSize: 220_000,
    label: "access",
  },
  {
    projectId: "proj-14",
    matchPct: 66,
    riskLevel: 3,
    clubDealInvestors: 2,
    round: "seed",
    askAmount: 700_000,
    ticketSize: 90_000,
    label: "dealflow",
  },
  {
    projectId: "proj-15",
    matchPct: 78,
    riskLevel: 2,
    clubDealInvestors: 4,
    round: "series-b",
    askAmount: 2_500_000,
    ticketSize: 250_000,
    label: "invested",
  },
];

export function getDealByProjectId(projectId: string): PortfolioDeal | undefined {
  return INVESTOR_DEALS.find((d) => d.projectId === projectId);
}

export function getDealsByLabel(label: PortfolioDeal["label"]): PortfolioDeal[] {
  return INVESTOR_DEALS.filter((d) => d.label === label);
}
