import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** One small metadata chip rendered in a card's footer row (assignee, due
 *  date, reward amount, metric delta, …) — kind-specific, so each Card Feed
 *  use case supplies its own via `CardFeedConfig.getMeta`. */
export interface CardFeedMetaEntry {
  key: string;
  label: string;
  icon?: LucideIcon;
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
  /** Shown when `items` is empty. Defaults to a generic message. */
  emptyMessage?: ReactNode;
}
