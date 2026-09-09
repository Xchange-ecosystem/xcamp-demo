// Data Room fixtures (B4 Stage 3) — the evidence artifacts behind a project,
// and which projects the viewer can open at all.
//
// P1-only, same status as clubDeals.ts / portfolio.ts / wallet.ts: there is no
// document store in the product, and Objective.proofCount is a count with no
// rows behind it. These are the rows. They are authored rather than generated,
// because a Data Room whose contents were synthesised from objective titles
// would read as filler the moment anyone looked twice.
//
// Access follows INITIAL_DEAL_STAGES: shortlisting a project is what unlocks
// its Data Room (the Club Deal Finder stage table is the single source of that
// truth, so the two screens cannot disagree). Watchlist-stage projects are
// listed but locked — the lock is the point, not an omission.
import { INITIAL_DEAL_STAGES } from "./clubDeals";
import type { ClubDealStage } from "./types";

export type DataRoomDocKind = "report" | "certificate" | "dataset" | "model" | "contract" | "deck";

export interface DataRoomDocument {
  id: string;
  projectId: string;
  /** The objective this evidences, or null for project-level material. */
  objectiveId: string | null;
  name: string;
  kind: DataRoomDocKind;
  /** Display-only; nothing is downloadable in the demo. */
  sizeLabel: string;
  addedAt: string;
  /** Signed off by an external assessor rather than self-filed — the same
   *  four-eyes distinction Objective.hasExternalAssessor carries. */
  externallyAssessed: boolean;
}

export const DATA_ROOM_DOCUMENTS: DataRoomDocument[] = [
  // ── Solari Energy (proj-1), the consistent demo project. Richest set,
  //    anchored to the obj-17..22 completions Due Diligence also reads.
  {
    id: "doc-1",
    projectId: "proj-1",
    objectiveId: "obj-17",
    name: "Household willingness-to-pay survey — three counties",
    kind: "dataset",
    sizeLabel: "4.1 MB",
    addedAt: "2026-06-14",
    externallyAssessed: true,
  },
  {
    id: "doc-2",
    projectId: "proj-1",
    objectiveId: "obj-17",
    name: "Survey methodology and sampling frame",
    kind: "report",
    sizeLabel: "820 KB",
    addedAt: "2026-06-14",
    externallyAssessed: true,
  },
  {
    id: "doc-3",
    projectId: "proj-1",
    objectiveId: "obj-18",
    name: "Nine-month field reliability report — twelve sites",
    kind: "report",
    sizeLabel: "6.3 MB",
    addedAt: "2026-07-22",
    externallyAssessed: true,
  },
  {
    id: "doc-4",
    projectId: "proj-1",
    objectiveId: "obj-18",
    name: "Controller uptime telemetry export",
    kind: "dataset",
    sizeLabel: "12.8 MB",
    addedAt: "2026-07-20",
    externallyAssessed: false,
  },
  {
    id: "doc-5",
    projectId: "proj-1",
    objectiveId: "obj-19",
    name: "Unit economics model at 500-site scale",
    kind: "model",
    sizeLabel: "1.9 MB",
    addedAt: "2026-08-03",
    externallyAssessed: false,
  },
  {
    id: "doc-6",
    projectId: "proj-1",
    objectiveId: "obj-20",
    name: "Operator licensing and procurement path",
    kind: "report",
    sizeLabel: "1.1 MB",
    addedAt: "2026-08-19",
    externallyAssessed: false,
  },
  {
    id: "doc-7",
    projectId: "proj-1",
    objectiveId: "obj-21",
    name: "ISO 9001 certificate — contract manufacturer",
    kind: "certificate",
    sizeLabel: "340 KB",
    addedAt: "2026-08-28",
    externallyAssessed: true,
  },
  {
    id: "doc-8",
    projectId: "proj-1",
    objectiveId: "obj-21",
    name: "Manufacturing quality audit findings",
    kind: "report",
    sizeLabel: "2.2 MB",
    addedAt: "2026-08-26",
    externallyAssessed: true,
  },
  {
    id: "doc-9",
    projectId: "proj-1",
    objectiveId: null,
    name: "Cap table and shareholding summary",
    kind: "report",
    sizeLabel: "180 KB",
    addedAt: "2026-09-01",
    externallyAssessed: false,
  },
  {
    id: "doc-10",
    projectId: "proj-1",
    objectiveId: null,
    name: "Investor deck — September 2026",
    kind: "deck",
    sizeLabel: "8.7 MB",
    addedAt: "2026-09-01",
    externallyAssessed: false,
  },

  // ── Solari Storage (proj-2) — shortlisted
  {
    id: "doc-11",
    projectId: "proj-2",
    objectiveId: "obj-3",
    name: "UL 1974 pre-certification test results",
    kind: "report",
    sizeLabel: "3.4 MB",
    addedAt: "2026-08-12",
    externallyAssessed: true,
  },
  {
    id: "doc-12",
    projectId: "proj-2",
    objectiveId: "obj-3",
    name: "Second-life cell grading dataset",
    kind: "dataset",
    sizeLabel: "22.5 MB",
    addedAt: "2026-08-04",
    externallyAssessed: false,
  },
  {
    id: "doc-13",
    projectId: "proj-2",
    objectiveId: null,
    name: "Storage unit cost breakdown",
    kind: "model",
    sizeLabel: "640 KB",
    addedAt: "2026-08-22",
    externallyAssessed: false,
  },

  // ── Fernbase (proj-3) — committed
  {
    id: "doc-14",
    projectId: "proj-3",
    objectiveId: "obj-5",
    name: "Runtime 1.0 release readiness review",
    kind: "report",
    sizeLabel: "1.6 MB",
    addedAt: "2026-08-30",
    externallyAssessed: false,
  },
  {
    id: "doc-15",
    projectId: "proj-3",
    objectiveId: null,
    name: "Signed investment agreement",
    kind: "contract",
    sizeLabel: "410 KB",
    addedAt: "2026-08-15",
    externallyAssessed: true,
  },
  {
    id: "doc-16",
    projectId: "proj-3",
    objectiveId: null,
    name: "Developer adoption metrics — Q3",
    kind: "dataset",
    sizeLabel: "2.9 MB",
    addedAt: "2026-09-02",
    externallyAssessed: false,
  },

  // ── Loopwell Health (proj-5) — shortlisted
  {
    id: "doc-17",
    projectId: "proj-5",
    objectiveId: "obj-9",
    name: "FDA 510(k) submission package",
    kind: "report",
    sizeLabel: "18.2 MB",
    addedAt: "2026-08-27",
    externallyAssessed: true,
  },
  {
    id: "doc-18",
    projectId: "proj-5",
    objectiveId: "obj-10",
    name: "AI coaching clinical validation summary",
    kind: "report",
    sizeLabel: "5.1 MB",
    addedAt: "2026-08-18",
    externallyAssessed: true,
  },
  {
    id: "doc-19",
    projectId: "proj-5",
    objectiveId: null,
    name: "Reimbursement pathway analysis",
    kind: "report",
    sizeLabel: "1.3 MB",
    addedAt: "2026-09-03",
    externallyAssessed: false,
  },

  // ── Northlight Fleet (proj-8) — committed
  {
    id: "doc-20",
    projectId: "proj-8",
    objectiveId: "obj-15",
    name: "Fleet dashboard GA acceptance sign-off",
    kind: "certificate",
    sizeLabel: "290 KB",
    addedAt: "2026-07-18",
    externallyAssessed: true,
  },
  {
    id: "doc-21",
    projectId: "proj-8",
    objectiveId: "obj-16",
    name: "Usage-based billing migration report",
    kind: "report",
    sizeLabel: "980 KB",
    addedAt: "2026-07-10",
    externallyAssessed: false,
  },
  {
    id: "doc-22",
    projectId: "proj-8",
    objectiveId: null,
    name: "Signed investment agreement",
    kind: "contract",
    sizeLabel: "395 KB",
    addedAt: "2026-06-28",
    externallyAssessed: true,
  },
];

/** Watchlist is look-but-don't-open; every later stage unlocks the room. */
export function isDataRoomUnlocked(projectId: string): boolean {
  const stage: ClubDealStage = INITIAL_DEAL_STAGES[projectId] ?? "watchlist";
  return stage !== "watchlist";
}

export function getDataRoomDocuments(projectId: string): DataRoomDocument[] {
  return DATA_ROOM_DOCUMENTS.filter((d) => d.projectId === projectId).sort((a, b) =>
    b.addedAt.localeCompare(a.addedAt),
  );
}
