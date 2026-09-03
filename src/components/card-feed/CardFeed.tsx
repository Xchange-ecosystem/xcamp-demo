// Reusable Card Feed — one configurable component for all three P1 card-feed
// use cases (Founder action items, Investor/Operator project updates,
// Collaborator assignments). See types.ts for the config contract, README.md
// for the config shape + usage example, and configs.tsx for ready-made
// configs built against src/fixtures/feed.ts.
//
// Built fresh rather than extracted from GoalsFeed.tsx (see Part 3 Phase 0
// notes in the P1.0 session report) — GoalsFeed is an accordion-based
// objective/task editor wired directly to live Supabase hooks and
// AI-generation pending-state, not a generic list-of-cards component, and
// its own GoalCards.tsx documents that "no shared card component exists to
// import." This component follows that same card visual grammar (skin
// tokens, rounded surface, badge + title header) rather than duplicating a
// fourth inline copy of it.
import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { CardFeedConfig } from "./types";

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function CardFeed<T>({
  items,
  config,
  className,
}: {
  items: T[];
  config: CardFeedConfig<T>;
  className?: string;
}) {
  if (items.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        {config.emptyMessage ?? "Nothing here yet."}
      </p>
    );
  }

  return (
    <div className={cn("flex flex-col gap-3", className)} role="list">
      {items.map((item) => (
        <CardFeedCard key={config.getId(item)} item={item} config={config} />
      ))}
    </div>
  );
}

function CardFeedCard<T>({ item, config }: { item: T; config: CardFeedConfig<T> }) {
  const visual = config.getVisual(item);
  const Icon = visual.icon;
  const description = config.getDescription?.(item);
  const meta = config.getMeta?.(item) ?? [];
  const timestamp = config.getTimestamp?.(item);
  const clickable = !!config.onItemClick;

  return (
    <Card
      role="listitem"
      onClick={clickable ? () => config.onItemClick!(item) : undefined}
      className={cn("border-l-4 transition-shadow", clickable && "cursor-pointer")}
      style={{ borderLeftColor: visual.accent, boxShadow: "var(--shadow-card)" }}
      onMouseEnter={
        clickable
          ? (e) => (e.currentTarget.style.boxShadow = "var(--shadow-dropdown)")
          : undefined
      }
      onMouseLeave={
        clickable ? (e) => (e.currentTarget.style.boxShadow = "var(--shadow-card)") : undefined
      }
    >
      <CardContent className="flex flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2.5">
            <Icon
              size={16}
              className="mt-0.5 shrink-0"
              style={{ color: visual.accent }}
              aria-hidden
            />
            <span className="truncate text-sm font-semibold text-card-foreground">
              {config.getTitle(item)}
            </span>
          </div>
          <Badge
            variant="secondary"
            className="shrink-0 whitespace-nowrap"
            style={{ color: visual.accent }}
          >
            {visual.badgeLabel}
          </Badge>
        </div>

        {description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{description}</p>
        )}

        {(meta.length > 0 || timestamp) && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-muted-foreground">
            {meta.map((entry) => {
              const MetaIcon = entry.icon;
              return (
                <span key={entry.key} className="inline-flex items-center gap-1">
                  {MetaIcon && <MetaIcon size={12} aria-hidden />}
                  {entry.label}
                </span>
              );
            })}
            {timestamp && (
              <span className="ml-auto inline-flex items-center gap-1">
                <Clock size={12} aria-hidden />
                {formatTimestamp(timestamp)}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
