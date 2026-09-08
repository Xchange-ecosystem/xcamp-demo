import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** One small metadata chip rendered in a card's footer row (assignee, due
 *  date, reward amount, metric delta, …) — kind-specific, so each Card Feed
 *  use case supplies its own via `CardFeedConfig.getMeta`. */
export interface CardFeedMetaEntry {
  key: string;
  label: string;
  icon?: LucideIcon;
  /** A CSS color value for a small dot rendered before the label — used for
   *  the project-tag treatment so items can be scanned by project without
   *  reading text. Mutually exclusive with `icon` in practice, but not
   *  enforced: no current entry sets both. */
  dotColor?: string;
}

/** Visual treatment for one card — varies per item (e.g. by `kind` and/or
 *  `status`), not fixed per feed, so a single feed can mix e.g. "done" and
 *  "active" cards with different accents. */
export interface CardFeedItemVisual {
  icon: LucideIcon;
  /** Badge text, e.g. "Action item", "Update", "Assigned to you". */
  badgeLabel: string;
  /** A CSS color value (custom property reference or literal) used for the
   *  icon and left accent — e.g. "var(--skin-accent)", "var(--skin-good)". */
  accent: string;
}

/** One action button rendered in a card's footer row (e.g. "Review",
 *  "Dismiss", "Open proposal") — added for P1.1's Founder action-item feed,
 *  whose cards need per-item actions distinct from the single `onItemClick`
 *  navigation hook. `onClick` receives the item so callers don't need to
 *  close over it per-row. */
export interface CardFeedAction<T> {
  key: string;
  label: string;
  onClick: (item: T) => void;
  variant?: "default" | "outline" | "ghost";
}

/** Config-driven contract for CardFeed<T> — one component, any item shape.
 *  Each P1 use case (Founder action items, Investor/Operator updates,
 *  Collaborator assignments) supplies its own config instead of forking the
 *  component. See src/fixtures/feed.ts FeedItem for the shape these configs
 *  are built against, and configs.tsx for the three ready-made configs. */
export interface CardFeedConfig<T> {
  getId: (item: T) => string;
  getTitle: (item: T) => string;
  getDescription?: (item: T) => string | null | undefined;
  getVisual: (item: T) => CardFeedItemVisual;
  getMeta?: (item: T) => CardFeedMetaEntry[];
  getTimestamp?: (item: T) => string | null | undefined;
  onItemClick?: (item: T) => void;
  /** Per-item action buttons (e.g. Review/Dismiss) — independent of
   *  `onItemClick`, which is a whole-card click for navigation. */
  getActions?: (item: T) => CardFeedAction<T>[];
  /** Shown when `items` is empty. Defaults to a generic message. */
  emptyMessage?: ReactNode;
}
