// Club Deal Finder fixtures (B4) — the investor's own pipeline across the
// eight demo projects, plus how many *other* investors sit at each stage for
// each project.
//
// P1-only, same status as portfolio.ts and wallet.ts: there is no production
// analog for a club-deal pipeline, and no multi-user stage tracking exists
// anywhere in the product. The counts below are authored, not derived — they
// are the "how many others are looking at this" signal the screen is about,
// and inventing them here is honest in a way deriving them from unrelated
// fixture rows would not be.
import type { ClubDealStage } from "./types";

export const CLUB_DEAL_STAGES: {
  key: ClubDealStage;
  label: string;
  /** What the relationship to the project actually is at this stage. */
  hint: string;
}[] = [
  {
    key: "watchlist",
    label: "Watchlist",
    hint: "Passive observation. Baseline visibility, no extra access.",
  },
  {
    key: "shortlist",
    label: "Shortlist",
    hint: "Full view access. Unlocks the project's Data Room.",
  },
  {
    key: "deciding",
    label: "Deciding",
    hint: "Actively negotiating. Request the data you still need.",
  },
  {
    key: "committed",
    label: "Committed",
    hint: "Under contract. Binding terms, signed.",
  },
];

/** Where this investor currently sits on each project. Starting positions
 *  only — the screen moves cards in local state and nothing persists. */
export const INITIAL_DEAL_STAGES: Record<string, ClubDealStage> = {
  "proj-1": "deciding", // Solari Energy — the consistent demo project
  "proj-2": "shortlist",
  "proj-3": "committed",
  "proj-4": "watchlist",
  "proj-5": "shortlist",
  "proj-6": "watchlist",
  "proj-7": "watchlist",
  "proj-8": "committed",
};

/** How many other investors sit at each stage for a given project. Shaped so
 *  the numbers tell a story rather than being noise: interest thins out as
 *  the stages get more committing, and the strong performers (proj-8, proj-5)
 *  carry more weight further down the funnel than the weak ones (proj-4). */
const STAGE_COUNTS: Record<string, Record<ClubDealStage, number>> = {
  "proj-1": { watchlist: 14, shortlist: 6, deciding: 3, committed: 1 },
  "proj-2": { watchlist: 9, shortlist: 4, deciding: 1, committed: 0 },
  "proj-3": { watchlist: 21, shortlist: 11, deciding: 5, committed: 4 },
  "proj-4": { watchlist: 5, shortlist: 1, deciding: 0, committed: 0 },
  "proj-5": { watchlist: 18, shortlist: 9, deciding: 6, committed: 3 },
  "proj-6": { watchlist: 7, shortlist: 3, deciding: 1, committed: 0 },
  "proj-7": { watchlist: 11, shortlist: 2, deciding: 1, committed: 1 },
  "proj-8": { watchlist: 24, shortlist: 13, deciding: 7, committed: 6 },
};

/** Other investors at `stage` for `projectId`. Reads as "besides you", which
 *  is why the screen can show it next to a card the viewer themselves has
 *  placed in that column. */
export function getWatchCount(projectId: string, stage: ClubDealStage): number {
  return STAGE_COUNTS[projectId]?.[stage] ?? 0;
}
