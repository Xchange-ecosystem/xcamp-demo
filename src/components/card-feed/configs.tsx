// Ready-made CardFeedConfig<FeedItem> values built against
// src/fixtures/feed.ts. The collaborator screen now uses its richer
// Assignment fixture through a screen-local config.
import { CheckCircle2, ClipboardCheck, Lightbulb, TrendingDown, TrendingUp } from "lucide-react";
import type { FeedItem } from "@/fixtures/types";
import { getPersonById } from "@/fixtures/people";
import { getProjectById } from "@/fixtures/projects";
import type { CardFeedConfig, CardFeedItemVisual, CardFeedMetaEntry } from "./types";

function projectMeta(item: FeedItem): CardFeedMetaEntry | null {
  const project = getProjectById(item.projectId);
  return project ? { key: "project", label: project.name } : null;
}

// ── Founder action items (P1.1) ───────────────────────────────────────────
export const founderActionItemConfig: CardFeedConfig<FeedItem> = {
  getId: (item) => item.id,
  getTitle: (item) => item.title,
  getDescription: (item) => item.description,
  getVisual: (item): CardFeedItemVisual => ({
    icon: item.status === "completed" || item.status === "done" ? CheckCircle2 : Lightbulb,
    badgeLabel:
      item.status === "completed" || item.status === "done"
        ? "Actioned"
        : item.status === "inactive"
          ? "Suggested"
          : "Needs review",
    accent:
      item.status === "completed" || item.status === "done"
        ? "var(--skin-good)"
        : "var(--skin-accent)",
  }),
  getMeta: (item) => {
    const entries: CardFeedMetaEntry[] = [];
    const project = projectMeta(item);
    if (project) entries.push(project);
    if (item.assigneeId) {
      const person = getPersonById(item.assigneeId);
      if (person) entries.push({ key: "assignee", label: `→ ${person.displayName}` });
    }
    return entries;
  },
  getTimestamp: (item) => item.timestamp,
  emptyMessage: "No action items right now — upload a note or transcript to get started.",
};

// ── Investor/Operator project updates (P1.2, P1.6) ────────────────────────
export const investorUpdateConfig: CardFeedConfig<FeedItem> = {
  getId: (item) => item.id,
  getTitle: (item) => item.title,
  getDescription: (item) => item.description,
  getVisual: (item): CardFeedItemVisual => {
    const delta = typeof item.meta?.metricDeltaPct === "number" ? item.meta.metricDeltaPct : 0;
    return {
      icon: delta < 0 ? TrendingDown : TrendingUp,
      badgeLabel: delta === 0 ? "Update" : `${delta > 0 ? "+" : ""}${delta}%`,
      accent: delta < 0 ? "var(--skin-bad)" : "var(--skin-accent)",
    };
  },
  getMeta: (item) => {
    const entries: CardFeedMetaEntry[] = [];
    const project = projectMeta(item);
    if (project) entries.push(project);
    if (item.actorId) {
      const person = getPersonById(item.actorId);
      if (person) entries.push({ key: "actor", label: person.displayName });
    }
    return entries;
  },
  getTimestamp: (item) => item.timestamp,
  emptyMessage: "No portfolio updates yet.",
};

// ── Collaborator assignments (P1.3) ───────────────────────────────────────
export const collaboratorAssignmentConfig: CardFeedConfig<FeedItem> = {
  getId: (item) => item.id,
  getTitle: (item) => item.title,
  getDescription: (item) => item.description,
  getVisual: (item): CardFeedItemVisual => ({
    icon: ClipboardCheck,
    badgeLabel: item.status === "completed" ? "Completed" : "Assigned to you",
    accent: item.status === "completed" ? "var(--skin-good)" : "var(--skin-accent)",
  }),
  getMeta: (item) => {
    const entries: CardFeedMetaEntry[] = [];
    const project = projectMeta(item);
    if (project) entries.push(project);
    const dueDate = item.meta?.dueDate;
    if (typeof dueDate === "string") entries.push({ key: "due", label: `Due ${dueDate}` });
    const reward = item.meta?.rewardAmount;
    if (typeof reward === "number")
      entries.push({ key: "reward", label: `$${reward} on completion` });
    return entries;
  },
  getTimestamp: (item) => item.timestamp,
  emptyMessage: "No assignments right now.",
};
