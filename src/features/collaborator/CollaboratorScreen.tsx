// P1.3 — Collaborator screen: assignment feed (Part 1) + right-column
// metrics and value wallet (Part 2).
//
// Phase 0 decision: configure CardFeed<T> fresh (see AssignmentFeed.tsx),
// not extract/adapt NavigatorBrowser.tsx. NavigatorBrowser (610 lines) is
// wired directly to a real API (useQuery + lib/navigator-api.ts) and to
// app-wide contexts (auth, active-project, sidepanel) — it's a general
// objective/task browser with search/filter/sort/group-by, not a
// single-collaborator feed, and none of that live wiring or the
// column/toolbar UI maps onto "my assignments." CardFeed<T>, by contrast,
// was already built in P1.0 specifically to cover this exact use case
// (src/components/card-feed/configs.tsx already ships a starter
// `collaboratorAssignmentConfig`) and is the pattern both sibling P1
// screens (Founder, Investor/Operator) already used successfully. Building
// this screen the same way keeps all three P1 card-feed screens on one
// component instead of introducing a second, heavier feed paradigm for
// P1.3 alone.
//
// Data note: `agreementState` does not exist on this branch's fixtures
// (confirmed — see src/fixtures/assignments.ts). This screen's workflow
// and value states are modeled in a new, additive fixture file instead of
// touching feed.ts/portfolio.ts/types.ts, to avoid colliding with PR #145
// (open, also touches those three files).
import { useState } from "react";
import { AssignmentFeed } from "./AssignmentFeed";
import { CollaboratorMetrics } from "./CollaboratorMetrics";
import { ValueWallet } from "./ValueWallet";
import {
  DEMO_COLLABORATOR_ID,
  getAssignmentsByAssignee,
  type Assignment,
} from "@/fixtures/assignments";
import { getPersonById } from "@/fixtures/people";

export function CollaboratorScreen() {
  const [assignments, setAssignments] = useState<Assignment[]>(() =>
    getAssignmentsByAssignee(DEMO_COLLABORATOR_ID),
  );
  const collaborator = getPersonById(DEMO_COLLABORATOR_ID);

  return (
    <div className="flex flex-col gap-6 px-6 py-6 lg:flex-row lg:items-start lg:gap-8">
      <section className="min-w-0 flex-1">
        <h1 className="mb-4 text-2xl font-semibold tracking-tight text-foreground">
          My assignments
          {collaborator && (
            <span className="ml-2 font-normal text-muted-foreground">
              — {collaborator.displayName}
            </span>
          )}
        </h1>
        <AssignmentFeed assignments={assignments} onChange={setAssignments} />
      </section>

      <aside className="flex w-full max-w-[320px] shrink-0 flex-col gap-6">
        <div>
          <h2 className="mb-2.5 text-sm font-semibold text-muted-foreground">My wallet</h2>
          <ValueWallet assignments={assignments} collaboratorId={DEMO_COLLABORATOR_ID} />
        </div>
        <CollaboratorMetrics assignments={assignments} />
      </aside>
    </div>
  );
}
