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

/** Which part of the business an Objective moves — real concept in the
 *  objectives/proof model (an objective already belongs to one area of the
 *  business in production), just not previously modeled in this fixture. */
export type ObjectiveDimension = "Market" | "Product" | "Operations" | "Business" | "Team";

export interface Objective {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: ObjectiveStatus;
  sortOrder: number;
  /** Real concept (objectives.dimension), not previously modeled here. */
  dimension: ObjectiveDimension;
  /** ISO date the objective first entered "in_progress"; null if it never
   *  has (status "open"/"suggested"). Fixture-only — production tracks
   *  status transitions rather than storing a start date on the row. */
  startedAt: string | null;
  /** ISO date the objective was last touched — a status change, a proof
   *  filing, or an evaluation. Mirrors production `objectives.updated_at`.
   *  Always at or after `startedAt` and `completedAt`. */
  updatedAt: string;
  completedAt: string | null; // ISO date; null unless status === "done"
  /** Real concept (count of filed proof/evidence rows against this
   *  objective), not previously modeled here. */
  proofCount: number;
  /** Assessor score 0-100; null if uncertified. Anticipates evaluation
   *  storage that is not yet settled in production — no production
   *  analog exists for this field yet. */
  evaluationPct: number | null;
}

/** One recorded movement on an Objective — the history behind the single
 *  current `Objective.status`. Fixture-only: production derives objective
 *  history from audit rows rather than storing a typed event table, so this
 *  is P1's stand-in for that history, same disclaimer as portfolio.ts.
 *
 *  Convention: an event where `from === to` records movement that did NOT
 *  change status — a resume after a stall, a re-scope, or a late finding
 *  filed against already-closed work. It is not a data error. A stall is
 *  therefore readable as the gap between two consecutive `at` values, not
 *  as an event of its own. */
export interface ObjectiveEvent {
  id: string;
  objectiveId: string;
  at: string; // ISO date
  from: ObjectiveStatus | null; // null for the creation event
  to: ObjectiveStatus;
  actorId: string | null; // Person.id
  note: string | null; // short human line, e.g. why it was re-opened
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
  /** ISO date the task was actually finished; null unless `done`. Distinct
   *  from `dueDate`, which is the deadline. Mirrors the production `notes`
   *  row's `end_date` for note_type='task'. */
  completedAt: string | null;
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

/** One card in the generic Card Feed fixture set. Founder action items and
 *  Investor/Operator project updates use this shape directly. The richer
 *  Collaborator screen uses Assignment because it has independent workflow
 *  and value lifecycles. */
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
  /** B1 demo session: the Task fixture (src/fixtures/objectives.ts) this
   *  action item corresponds to, for Founder Home's "open details" card
   *  affordance to open in the sidepanel. Only set on action_item entries
   *  that have an obvious fixture-task counterpart. */
  demoTaskId?: string;
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

// ── Investor/Operator showcase (this session) ───────────────────────────────
// P1-only, no production analog yet — same disclaimer as PortfolioEntry.

export type InvestmentRound = "pre-seed" | "seed" | "series-a" | "series-b" | "series-c-plus";

/** Which sidepanel CTA / tab a project sits under for one investor. `null`
 *  means "no label yet" — the project still appears under the "All" tab
 *  (see the tab table in the session brief), just not under any other. */
export type PortfolioLabel = "watchlist" | "shortlist" | "access" | "dealflow" | "invested";

/** Investor Portfolio View's filter/label dataset — one entry per Project.
 *  `matchPct` is authored directly (there's no underlying series to derive
 *  it from, same as ProjectMetricsEntry.progressPct); everything else here
 *  is also authored deal-term data, not derived. */
export interface PortfolioDeal {
  projectId: string;
  matchPct: number; // 0-100 — how well the project matches this investor's mandate
  riskLevel: 1 | 2 | 3 | 4 | 5; // 1 = lowest risk, 5 = highest
  clubDealInvestors: number; // co-investors already committed to this round; 0 = none
  round: InvestmentRound;
  askAmount: number; // EUR — total raise the project is seeking
  ticketSize: number; // EUR — this investor's own typical/suggested ticket
  label: PortfolioLabel | null;
}

export interface Ecosystem {
  id: string;
  name: string;
  description: string;
  color: string;
  region: string;
}

export type NetworkNodeKind = "person" | "project";

/** One node in the Ecosystem Navigator's network canvas, scoped to one
 *  ecosystem. `refId` resolves to a real Person.id or Project.id — never an
 *  orphaned reference, per the fixture layer's cross-referencing rule. */
export interface NetworkNode {
  id: string;
  kind: NetworkNodeKind;
  ecosystemId: string;
  refId: string;
}

/** A cross-connection between two NetworkNode ids (or, for the Ecosphere
 *  altitude, two Ecosystem ids). Decorative only — the brief is explicit
 *  that these carry no defined semantic meaning for this showcase, just
 *  enough visual density to read as a live network. */
export interface NetworkEdge {
  id: string;
  sourceId: string;
  targetId: string;
}
