import { create } from "zustand";
import {
  READINESS_CRITERIA,
  READINESS_SUGGESTIONS,
  type ReadinessMatch,
  type ReadinessSuggestion,
} from "@/fixtures/readinessMatching";

// In-memory, session-local store backing the Readiness matching-review
// screen — same fixture-forked, local-state-only pattern as
// src/store/demoItemsStore.ts (B1 sidepanel/fullscreen): seeded once from
// the static fixture, mutated only via set(), nothing here ever calls
// `supabase` or any `*-api.ts` module, no persistence, resets on reload.

interface ReadinessMatchingStore {
  /** Confirmed matches per criterion id, seeded from READINESS_CRITERIA and
   *  grown by acceptSuggestion. */
  confirmedByCriterion: Record<string, ReadinessMatch[]>;
  /** Pending Copilot suggestions across all criteria, seeded from
   *  READINESS_SUGGESTIONS and shrunk by accept/reject. */
  pendingSuggestions: ReadinessSuggestion[];

  /** Moves a suggestion into its criterion's confirmed matches and drops it
   *  from the pending list. */
  acceptSuggestion: (suggestionId: string) => void;
  /** Drops a suggestion from the pending list only — no other side effects. */
  rejectSuggestion: (suggestionId: string) => void;
}

function seedConfirmed(): Record<string, ReadinessMatch[]> {
  return Object.fromEntries(READINESS_CRITERIA.map((c) => [c.id, c.confirmed]));
}

export const useReadinessMatchingStore = create<ReadinessMatchingStore>()((set) => ({
  confirmedByCriterion: seedConfirmed(),
  pendingSuggestions: READINESS_SUGGESTIONS,

  acceptSuggestion: (suggestionId) =>
    set((s) => {
      const suggestion = s.pendingSuggestions.find((x) => x.id === suggestionId);
      if (!suggestion) return s;
      const { criterionId, rationale: _rationale, ...match } = suggestion;
      const existing = s.confirmedByCriterion[criterionId] ?? [];
      return {
        confirmedByCriterion: {
          ...s.confirmedByCriterion,
          [criterionId]: [...existing, match],
        },
        pendingSuggestions: s.pendingSuggestions.filter((x) => x.id !== suggestionId),
      };
    }),

  rejectSuggestion: (suggestionId) =>
    set((s) => ({
      pendingSuggestions: s.pendingSuggestions.filter((x) => x.id !== suggestionId),
    })),
}));
