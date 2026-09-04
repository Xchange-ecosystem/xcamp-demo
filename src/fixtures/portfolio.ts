import type { PortfolioEntry } from "./types";

// The ranked bar list's real weekly series (P1-CORR Part 2 — replaces the
// single current-score-plus-delta shape the screen shipped with, which had
// nothing to animate a timeline against). Eight weeks, oldest first, ending
// "now". Shaped deliberately rather than as a random walk:
//   - proj-8 climbs and overtakes the declining proj-7 around week 3
//   - proj-5 climbs and overtakes proj-3 around week 5
//   - proj-6 climbs and overtakes both proj-2 and proj-4 by week 4
//   - proj-7 and proj-4 decline across the entire window
// The final week reproduces the exact ranking the old single-point fixture
// hand-authored (proj-8, 5, 3, 1, 7, 6, 2, 4), so nothing downstream that
// reads "current" score/rank/delta changes.
export const PORTFOLIO_WEEKS = [
  "16 Jul",
  "23 Jul",
  "30 Jul",
  "6 Aug",
  "13 Aug",
  "20 Aug",
  "27 Aug",
  "3 Sep",
] as const;

interface PortfolioSeed {
  projectId: string;
  scores: number[]; // 8 weekly values, oldest first
  investedAmount: number;
  currentValuation: number;
}

const SEEDS: PortfolioSeed[] = [
  {
    projectId: "proj-8",
    scores: [78, 80, 83, 85, 87, 89, 91, 94],
    investedAmount: 500000,
    currentValuation: 3200000,
  },
  {
    projectId: "proj-5",
    scores: [62, 66, 70, 75, 78, 83, 86, 89],
    investedAmount: 750000,
    currentValuation: 4100000,
  },
  {
    projectId: "proj-3",
    scores: [70, 73, 76, 78, 80, 82, 83, 85],
    investedAmount: 400000,
    currentValuation: 2600000,
  },
  {
    projectId: "proj-1",
    scores: [69, 71, 73, 74, 75, 76, 76, 77],
    investedAmount: 600000,
    currentValuation: 2100000,
  },
  {
    projectId: "proj-7",
    scores: [88, 86, 84, 82, 79, 78, 75, 74],
    investedAmount: 900000,
    currentValuation: 2450000,
  },
  {
    projectId: "proj-6",
    scores: [50, 52, 54, 56, 57, 58, 59, 61],
    investedAmount: 300000,
    currentValuation: 950000,
  },
  {
    projectId: "proj-2",
    scores: [58, 57, 56, 55, 54, 53, 53, 52],
    investedAmount: 250000,
    currentValuation: 610000,
  },
  {
    projectId: "proj-4",
    scores: [55, 51, 49, 46, 44, 41, 40, 38],
    investedAmount: 150000,
    currentValuation: 280000,
  },
];

function buildPortfolio(): PortfolioEntry[] {
  const withScore = SEEDS.map((seed) => {
    const last = seed.scores[seed.scores.length - 1];
    const previous = seed.scores[seed.scores.length - 2];
    return {
      ...seed,
      performanceScore: last,
      performanceDeltaPct: last - previous,
    };
  });
  const rankByProjectId = new Map(
    [...withScore]
      .sort((a, b) => b.performanceScore - a.performanceScore)
      .map((entry, index) => [entry.projectId, index + 1]),
  );
  return withScore.map((entry) => ({ ...entry, rank: rankByProjectId.get(entry.projectId)! }));
}

export const PORTFOLIO: PortfolioEntry[] = buildPortfolio();

export function getPortfolioEntry(projectId: string): PortfolioEntry | undefined {
  return PORTFOLIO.find((p) => p.projectId === projectId);
}

export function getRankedPortfolio(): PortfolioEntry[] {
  return [...PORTFOLIO].sort((a, b) => a.rank - b.rank);
}
