// Shared mock-data layer — entity types.
//
// Field names deliberately mirror the real xcamp-backend/Supabase schema
// (see src/types/xcamp.ts, src/lib/xcamp-api.ts) so P2's real-data wiring
// doesn't require reshaping these fixtures — e.g. Project.name mirrors
// `projects.title` as already exposed by listProjectsFull(), Objective
// mirrors the `objectives` table, Task mirrors a `notes` row with
// note_type='task'. Fields with no production equivalent yet (rank,
// performanceScore, portfolio, wallet, transcripts, chat) are P1-only and
// clearly scoped as such below.

export type PersonaRole = "founder" | "investor" | "collaborator" | "admin";

export interface Person {
  id: string;
  displayName: string; // mirrors central_users.display_name
  avatarUrl: string | null;
  role: PersonaRole;
  title: string; // e.g. "Founder, Solari" — display line under the name
  email: string;
}

export type ProjectStatus = "active" | "paused" | "completed";

export interface Project {
  id: string;
  name: string; // mirrors projects.title (exposed as `name` by xcamp-api.ts)
  description: string;
  color: string; // mirrors projects.color — hex accent used for cover/avatar
  featureImage: string | null; // mirrors projects.feature_image
  status: ProjectStatus;
  tags: string[];
  ownerId: string; // Person.id — the founder
  updatedAt: string; // ISO date
}

export type ObjectiveStatus = "open" | "in_progress" | "done" | "suggested";

export interface Objective {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: ObjectiveStatus;
  sortOrder: number;
}

export type TaskStatus = "inactive" | "active" | "completed";

export interface Task {
  id: string;
  objectiveId: string;
  projectId: string;
  title: string;
  done: boolean;
  status: TaskStatus;
  assigneeId: string | null; // Person.id — a collaborator
  dueDate: string | null; // ISO date
  priority: "low" | "medium" | "high";
}

/** Per-project metrics row. Progress is the one field with a real production
 *  analog (ProjectDetailMetrics in xcamp-api.ts); quality/proof/members are
 *  illustrative placeholders, same disclaimer as the pre-existing
 *  investorMetricsMock.ts this supersedes for P1 screens. */
export interface ProjectMetricsEntry {
  projectId: string;
  progressPct: number;
  qualityPct: number;
  proofTotal: number;
  proofAvgPerTask: number;
  collaboratorsCount: number;
  viewersCount: number;
}

/** Ecosystem-wide aggregate metrics (Investor/Operator Portfolio + Dashboard). */
export interface EcosystemMetrics {
  totalProjects: number;
  activeProjects: number;
  totalPeople: number;
  totalObjectives: number;
  totalTasksCompleted: number;
  avgProgressPct: number;
  avgQualityPct: number;
}

/** Investor's ranked view of a project — P1-only, no production analog yet.
 *  `performanceScore`/`performanceDeltaPct`/`rank` are derived from `scores`
 *  (see src/fixtures/portfolio.ts's buildPortfolio) rather than
 *  independently authored, so they can't drift out of sync with it. */
export interface PortfolioEntry {
  projectId: string;
  rank: number;
  performanceScore: number; // 0-100 — scores[scores.length - 1]
  performanceDeltaPct: number; // last week minus the week before, can be negative
  investedAmount: number;
  currentValuation: number;
  /** Eight weekly match-score values, oldest first — drives the ranked bar
   *  list's playback (see PORTFOLIO_WEEKS for the matching labels). */
  scores: number[];
}

/** One card in the Card Feed component (Part 3). Covers all three P1 use
 *  cases (Founder action items, Investor/Operator project updates,
 *  Collaborator assignments) via `kind`, so screens don't need bespoke
 *  per-persona fixture shapes. */
export type FeedItemKind = "action_item" | "project_update" | "assignment";

export interface FeedItem {
  id: string;
  kind: FeedItemKind;
  title: string;
  description: string | null;
  projectId: string;
  actorId: string | null; // Person.id — who raised/posted/assigned this
  assigneeId: string | null; // Person.id — for assignment cards
  status: ObjectiveStatus | TaskStatus;
  timestamp: string; // ISO date
  /** Where an action item sits in the real agreement lifecycle (confirmed
   *  against the live Supabase schema: assignment_value_type
   *  informational|fund_linked, objectives.value_distribution_locked,
   *  promote_objective_to_agreement / _finalize_objective RPCs) — distinct
   *  from `status` above, which tracks whether the work itself is done,
   *  not whether its value has been formalized. Optional: only
   *  `action_item` feed items carry it today. */
  agreementState?: "sketch" | "agreement" | "settled";
  /** Kind-specific extras (amount for assignments, metric delta for
   *  updates, source note id for action items) — kept loose since each
   *  card type surfaces different metadata. */
  meta?: Record<string, string | number>;
}

export interface Transcript {
  id: string;
  title: string;
  date: string; // ISO date
  participants: string[]; // display names, not necessarily fixture Person ids
  projectId: string | null;
  rawText: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: string; // ISO date
}

export type WalletEntryType = "reward" | "bonus" | "payout";

export interface WalletEntry {
  id: string;
  personId: string;
  projectId: string;
  type: WalletEntryType;
  amount: number;
  description: string;
  date: string; // ISO date
}
