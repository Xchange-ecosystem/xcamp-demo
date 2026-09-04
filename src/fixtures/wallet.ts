import type { WalletEntry } from "./types";

// Value wallet entries for the Collaborator screen (P1.3) — rewards/bonuses
// tied to completed assignments. personId/projectId cross-reference
// PEOPLE/PROJECTS; amounts line up with FEED_ITEMS' assignment `rewardAmount`
// where the underlying task is the same.
export const WALLET_ENTRIES: WalletEntry[] = [
  {
    id: "wallet-1",
    personId: "person-9",
    projectId: "proj-1",
    type: "reward",
    amount: 180,
    description: "Finalized BOM for v2 controller board",
    date: "2026-08-20",
  },
  {
    id: "wallet-2",
    personId: "person-7",
    projectId: "proj-3",
    type: "reward",
    amount: 90,
    description: "Wrote Runtime 1.0 migration guide",
    date: "2026-08-22",
  },
  {
    id: "wallet-3",
    personId: "person-11",
    projectId: "proj-3",
    type: "bonus",
    amount: 50,
    description: "Launched dev-community Discord ahead of schedule",
    date: "2026-08-05",
  },
  {
    id: "wallet-4",
    personId: "person-3",
    projectId: "proj-5",
    type: "reward",
    amount: 210,
    description: "Addressed FDA pre-submission feedback",
    date: "2026-08-18",
  },
  {
    id: "wallet-5",
    personId: "person-11",
    projectId: "proj-6",
    type: "reward",
    amount: 70,
    description: "Drafted clinic onboarding checklist",
    date: "2026-08-12",
  },
  {
    id: "wallet-6",
    personId: "person-9",
    projectId: "proj-7",
    type: "reward",
    amount: 160,
    description: "Calibrated inspection cameras for salt spray",
    date: "2026-08-08",
  },
  {
    id: "wallet-7",
    personId: "person-7",
    projectId: "proj-8",
    type: "reward",
    amount: 200,
    description: "Final QA pass on Fleet dashboard",
    date: "2026-07-15",
  },
  {
    id: "wallet-8",
    personId: "person-8",
    projectId: "proj-8",
    type: "reward",
    amount: 90,
    description: "Published GA release notes",
    date: "2026-07-18",
  },
  {
    id: "wallet-9",
    personId: "person-10",
    projectId: "proj-8",
    type: "reward",
    amount: 150,
    description: "Migrated existing customers to usage billing",
    date: "2026-07-10",
  },
  {
    id: "wallet-10",
    personId: "person-9",
    projectId: "proj-2",
    type: "reward",
    amount: 140,
    description: "Submitted UL 1974 test samples",
    date: "2026-08-10",
  },
  {
    id: "wallet-11",
    personId: "person-7",
    projectId: "proj-1",
    type: "bonus",
    amount: 40,
    description: "Referral bonus — brought Yuki onto Solari Energy",
    date: "2026-08-01",
  },
  {
    id: "wallet-12",
    personId: "person-8",
    projectId: "proj-1",
    type: "payout",
    amount: 300,
    description: "Monthly growth-marketing payout",
    date: "2026-08-31",
  },
];

export function getWalletByPerson(personId: string): WalletEntry[] {
  return WALLET_ENTRIES.filter((w) => w.personId === personId);
}

export function getWalletBalance(personId: string): number {
  return getWalletByPerson(personId).reduce((sum, w) => sum + w.amount, 0);
}
