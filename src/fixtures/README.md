# P1 shared mock-data layer

One shared fixture module for all P1 screens (Founder, Investor/Operator
Portfolio, Investor Dashboard, Collaborator). Import from the barrel,
not individual files:

```ts
import { PEOPLE, PROJECTS, getFeedByKind, getProjectMetrics } from "@/fixtures";
```

## Entities

| File             | Exports                                                                                                           | Used by                                                                                  |
| ---------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `people.ts`      | `PEOPLE`, `getPersonById`, `getPeopleByRole`                                                                      | all screens                                                                              |
| `projects.ts`    | `PROJECTS`, `getProjectById`, `getProjectsByOwner`                                                                | all screens                                                                              |
| `objectives.ts`  | `OBJECTIVES`, `TASKS`, `getObjectivesByProject`, `getTasksByObjective`, `getTasksByProject`, `getTasksByAssignee` | Founder, Collaborator                                                                    |
| `metrics.ts`     | `PROJECT_METRICS`, `ECOSYSTEM_METRICS`, `getProjectMetrics`                                                       | Founder (right-column), Investor/Operator, Investor Dashboard                            |
| `portfolio.ts`   | `PORTFOLIO`, `getPortfolioEntry`, `getRankedPortfolio`                                                            | Investor/Operator ranked bar list                                                        |
| `feed.ts`        | `FEED_ITEMS`, `getFeedByKind`, `getFeedByAssignee`, `getFeedByProject`                                            | Generic Founder and Investor feed fixtures plus legacy assignment examples               |
| `assignments.ts` | `ASSIGNMENTS`, `getAssignmentsByAssignee`                                                                         | Collaborator feed and its separate workflow/value lifecycle                              |
| `transcripts.ts` | `TRANSCRIPTS`, `getTranscriptById`                                                                                | Founder composer's Transcript mode sample inputs — extraction itself is real, not mocked |
| `chat.ts`        | `CHAT_MESSAGES`                                                                                                   | Investor Dashboard companion chat panel                                                  |
| `wallet.ts`      | `WALLET_ENTRIES`, `getWalletByPerson`, `getWalletBalance`                                                         | Collaborator value wallet                                                                |
| `pitch.ts`       | `PITCH_CARDS`, `getPitchCardById`                                                                                 | Founder MicroApps → Pitch (proj-1 only)                                                  |

IDs are stable strings (`person-1`, `proj-1`, `obj-1`, `task-1`, `feed-1`, …)
and cross-reference consistently: every `projectId`/`ownerId`/`assigneeId`/
`personId` in one fixture file resolves to a real row in another. There are
no orphaned references.

## Field-shape note

Field names mirror the real xcamp-backend/Supabase schema where one exists
(`Project.name` ~ `projects.title`, `Objective` ~ the `objectives` table,
`Task` ~ a `notes` row with `note_type='task'`) so P2's real-data wiring
shouldn't require reshaping these fixtures — see `types.ts` for the
per-field mapping notes. `PortfolioEntry`, `FeedItem`, `Transcript`,
`ChatMessage`, and `WalletEntry` are P1-only concepts with no production
table yet.

## Relationship to the pre-existing mocks

`src/lib/investorMetricsMock.ts` and `src/lib/ecosystemNavigatorMock.ts`
are **not** folded into this layer — they stay as-is. They serve a
different purpose: small illustrative placeholders bolted onto _existing,
live_ Supabase-backed screens (Project Home metrics, Ecosystem Navigator
user tiles) where most of the data on screen is already real. This fixture
layer is for the four _new_, fully-mocked P1 screens. Folding the two
together would make already-working live-data screens depend on the P1
demo dataset for no benefit.
