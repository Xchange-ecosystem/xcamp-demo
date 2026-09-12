import type { InvestmentRound, PortfolioDeal, PortfolioLabel } from "@/fixtures";

export const ROUND_LABELS: Record<InvestmentRound, string> = {
  "pre-seed": "Pre-seed",
  seed: "Seed",
  "series-a": "Series A",
  "series-b": "Series B",
  "series-c-plus": "Series C+",
};

export const ALL_ROUNDS: InvestmentRound[] = [
  "pre-seed",
  "seed",
  "series-a",
  "series-b",
  "series-c-plus",
];

export type ClubDealBucket = "none" | "one" | "two-to-four" | "four-plus";

export const CLUB_DEAL_BUCKETS: { key: ClubDealBucket; label: string }[] = [
  { key: "none", label: "None" },
  { key: "one", label: "1" },
  { key: "two-to-four", label: "2–4" },
  { key: "four-plus", label: "4+" },
];

// The brief's table lists "2-4" and "4+" as adjacent buckets, which overlap
// at exactly 4 read literally — treated here as adjacent, non-overlapping
// ranges (2-4 inclusive, 4+ meaning >4) so every deal falls in exactly one
// bucket.
export function clubDealBucketOf(count: number): ClubDealBucket {
  if (count <= 0) return "none";
  if (count === 1) return "one";
  if (count <= 4) return "two-to-four";
  return "four-plus";
}

export function formatEUR(amount: number): string {
  if (amount >= 1_000_000) {
    const millions = amount / 1_000_000;
    return `€${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)}M`;
  }
  if (amount >= 1_000) return `€${Math.round(amount / 1_000)}k`;
  return `€${amount}`;
}

export const RISK_LABELS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "Low",
  2: "Low-mid",
  3: "Medium",
  4: "Mid-high",
  5: "High",
};

export type PortfolioTabKey = "all" | PortfolioLabel;

export const PORTFOLIO_TABS: { key: PortfolioTabKey; label: string; cta: string }[] = [
  { key: "all", label: "All", cta: "Add to watchlist" },
  { key: "watchlist", label: "Watchlist", cta: "Add to shortlist" },
  { key: "shortlist", label: "Shortlist", cta: "Request view access" },
  { key: "access", label: "Access", cta: "Go to project" },
  { key: "dealflow", label: "Dealflow", cta: "Go to project" },
  { key: "invested", label: "Invested", cta: "Go to project" },
];

// "All" means "no label filter" (every project in the current ecosystem,
// labeled or not) — the brief's tab table lists All's "Meaning" as "No
// label", read here as "not filtered by label" rather than "only unlabeled
// projects", since a tab that hides most of the portfolio wouldn't work as
// this screen's default landing tab.
export function matchesTab(deal: PortfolioDeal, tab: PortfolioTabKey): boolean {
  if (tab === "all") return true;
  return deal.label === tab;
}

export interface PortfolioFilterState {
  minMatchPct: number;
  riskRange: [number, number];
  clubDealBucket: ClubDealBucket | null;
  rounds: InvestmentRound[];
  askRange: [number, number];
  ticketRange: [number, number];
}

export const MATCH_PCT_DEFAULT = 50;
export const RISK_RANGE_DEFAULT: [number, number] = [2, 4];
export const ASK_RANGE_BOUNDS: [number, number] = [50_000, 5_000_000];
export const TICKET_RANGE_BOUNDS: [number, number] = [10_000, 500_000];

export const DEFAULT_FILTER_STATE: PortfolioFilterState = {
  minMatchPct: MATCH_PCT_DEFAULT,
  riskRange: RISK_RANGE_DEFAULT,
  clubDealBucket: null,
  rounds: [],
  askRange: ASK_RANGE_BOUNDS,
  ticketRange: TICKET_RANGE_BOUNDS,
};

export function matchesFilters(deal: PortfolioDeal, filters: PortfolioFilterState): boolean {
  if (deal.matchPct < filters.minMatchPct) return false;
  if (deal.riskLevel < filters.riskRange[0] || deal.riskLevel > filters.riskRange[1]) return false;
  if (
    filters.clubDealBucket &&
    clubDealBucketOf(deal.clubDealInvestors) !== filters.clubDealBucket
  ) {
    return false;
  }
  if (filters.rounds.length > 0 && !filters.rounds.includes(deal.round)) return false;
  if (deal.askAmount < filters.askRange[0] || deal.askAmount > filters.askRange[1]) return false;
  if (deal.ticketSize < filters.ticketRange[0] || deal.ticketSize > filters.ticketRange[1]) {
    return false;
  }
  return true;
}

export function isFilterActive(filters: PortfolioFilterState): boolean {
  return (
    filters.minMatchPct !== MATCH_PCT_DEFAULT ||
    filters.riskRange[0] !== RISK_RANGE_DEFAULT[0] ||
    filters.riskRange[1] !== RISK_RANGE_DEFAULT[1] ||
    filters.clubDealBucket !== null ||
    filters.rounds.length > 0 ||
    filters.askRange[0] !== ASK_RANGE_BOUNDS[0] ||
    filters.askRange[1] !== ASK_RANGE_BOUNDS[1] ||
    filters.ticketRange[0] !== TICKET_RANGE_BOUNDS[0] ||
    filters.ticketRange[1] !== TICKET_RANGE_BOUNDS[1]
  );
}
