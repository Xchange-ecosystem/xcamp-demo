# Card Feed

One configurable component (`CardFeed<T>`) for all three P1 card-feed use
cases:

- **Founder** action-item feed (P1.1)
- **Investor/Operator** project-update feed (P1.2) and Investor Dashboard (P1.6)
- **Collaborator** assignment feed (P1.3)

## Built fresh, not extracted from `GoalsFeed.tsx`

`GoalsFeed.tsx` (the closest existing analog) is an accordion-based
objective/task editor wired directly to live Supabase hooks
(`useObjectives`, `useObjectiveTasks`, AI-generation pending-state,
accept/dismiss flows). It has no generic "list of cards with icon + status +
metadata" structure to extract — its own sibling file, `GoalCards.tsx`,
documents that "no shared card component exists to import" for that exact
reason. `CardFeed` follows the same visual grammar those pending-suggestion
cards established (skin tokens, rounded surface, badge + title header,
footer meta row) but is a new, generic component — it doesn't read from or
depend on GoalsFeed/GoalCards in any way.

## Config shape

`CardFeed` never branches on a "kind" internally — each use case supplies a
`CardFeedConfig<T>` of accessor functions, so adding a fourth feed type
never means forking the component:

```ts
interface CardFeedConfig<T> {
  getId: (item: T) => string;
  getTitle: (item: T) => string;
  getDescription?: (item: T) => string | null | undefined;
  getVisual: (item: T) => { icon: LucideIcon; badgeLabel: string; accent: string };
  getMeta?: (item: T) => { key: string; label: string; icon?: LucideIcon }[];
  getTimestamp?: (item: T) => string | null | undefined;
  onItemClick?: (item: T) => void;
  getActions?: (item: T) => {
    key: string;
    label: string;
    onClick: (item: T) => void;
    variant?: "default" | "outline" | "ghost";
  }[];
  emptyMessage?: ReactNode;
}
```

`getActions` (added in P1.1) renders per-item buttons in the card's footer,
independent of `onItemClick` — e.g. the Founder feed's "Review" / "Dismiss"
buttons that open the Part 4 proposal modal or drop an item, without making
the whole card clickable.

`getVisual` is per-_item_, not per-feed, so a single feed can mix e.g. a
completed (green) card with active (teal) ones — see `configs.tsx`, where
action items go from `Lightbulb`/teal to `CheckCircle2`/green once actioned.

## Usage example

```tsx
import { CardFeed } from "@/components/card-feed/CardFeed";
import { founderActionItemConfig } from "@/components/card-feed/configs";
import { getFeedByKind } from "@/fixtures";

function FounderActionFeed() {
  const items = getFeedByKind("action_item");
  return <CardFeed items={items} config={founderActionItemConfig} />;
}
```

`configs.tsx` ships three ready-made configs built against
`src/fixtures/feed.ts`'s `FeedItem` type — `founderActionItemConfig`,
`investorUpdateConfig`, `collaboratorAssignmentConfig` — one per P1 use
case. `CardFeed` itself is generic (`CardFeed<T>`), so a screen with a
differently-shaped feed can write its own config instead of adapting its
data to `FeedItem`.

## Styling

Every color in `CardFeed.tsx` and `configs.tsx` comes from the tokens wired
in Part 1 — `bg-card`/`text-card-foreground`/`text-muted-foreground`
(shadcn semantic tokens) for the card chrome, and `var(--skin-accent)` /
`var(--skin-good)` / `var(--skin-bad)` (Xcamp skin tokens) for the per-item
icon/badge/left-border accent. No hardcoded colors.
