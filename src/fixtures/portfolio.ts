import type { PortfolioEntry } from "./types";

// Ranked by performanceScore descending — drives the Investor/Operator
// Portfolio screen's animated ranked bar list (P1.2).
export const PORTFOLIO: PortfolioEntry[] = [
  { projectId: "proj-8", rank: 1, performanceScore: 94, performanceDeltaPct: 4.2, investedAmount: 500000, currentValuation: 3200000 },
  { projectId: "proj-5", rank: 2, performanceScore: 89, performanceDeltaPct: 6.8, investedAmount: 750000, currentValuation: 4100000 },
  { projectId: "proj-3", rank: 3, performanceScore: 85, performanceDeltaPct: 3.1, investedAmount: 400000, currentValuation: 2600000 },
  { projectId: "proj-1", rank: 4, performanceScore: 77, performanceDeltaPct: 1.5, investedAmount: 600000, currentValuation: 2100000 },
  { projectId: "proj-7", rank: 5, performanceScore: 74, performanceDeltaPct: -1.2, investedAmount: 900000, currentValuation: 2450000 },
  { projectId: "proj-6", rank: 6, performanceScore: 61, performanceDeltaPct: 2.0, investedAmount: 300000, currentValuation: 950000 },
  { projectId: "proj-2", rank: 7, performanceScore: 52, performanceDeltaPct: -0.4, investedAmount: 250000, currentValuation: 610000 },
  { projectId: "proj-4", rank: 8, performanceScore: 38, performanceDeltaPct: -3.6, investedAmount: 150000, currentValuation: 280000 },
];

export function getPortfolioEntry(projectId: string): PortfolioEntry | undefined {
  return PORTFOLIO.find((p) => p.projectId === projectId);
}

export function getRankedPortfolio(): PortfolioEntry[] {
  return [...PORTFOLIO].sort((a, b) => a.rank - b.rank);
}
