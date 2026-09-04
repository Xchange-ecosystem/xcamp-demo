# Recap — Briefing

**Status:** design agreed, not built.
**Repo:** `xcamp-companion`.
**ClickUp:** subtask of `EPIC P1.4 — Admin: Transcript → Assignments`, task `123y1w8a9p1`.
**Commit this file** to the root of `xcamp-companion` alongside `P1_Briefing.md` and `P0CrossRepoAuditReport.md`.

---

## 1. What Recap is, and what it is not

After a real video call with a prospect, the presenting user uploads the recording's transcript. A real AI pass
pulls out the follow-ups agreed during the call, works out whose they are, and puts an illustrative value on
each. The presenter corrects anything the extraction got wrong, enters the participants' email addresses,
reviews a prewritten English email, and sends. Each participant receives their own link to a public,
login-free page showing their follow-ups, the rest of the call for context, and what their organisation's
record would look like if the work ran on Xcamp.

It is a **sales artifact generator**. Its job is to make the product's value legible to someone who has just
sat through a call about it, using their own material rather than a demo project.

**It is not part of the investor demo.** It does not appear in the P1.5 walkthrough, is not shown during the
presentation, and does not sit under `/demo/*`.

### Against the rest of P1.4

| | P1.4 demo (Transcript pill in the Founder composer) | Recap |
|---|---|---|
| Audience | investors watching the pitch | prospects who were on a real call |
| Route | `/demo/*`, inside the Founder screen | `/admin/recap` and `/recap/:token` |
| Data | fixtures | real transcript, real model output, persisted |
| Output | simulated send, feed cards | published pages + real SendGrid email |
| In the walkthrough | yes | **no** |

The demo mockup's review step is the correct UI shape to reuse. What differs is that the right-hand preview
renders the actual public page, and everything on the screen is real.

---

## 2. Decisions taken

1. **Repo: `xcamp-companion`.** Public routes live under `/recap/*`, deliberately outside the `/demo/*`
   namespace, so the demo can be frozen or removed without taking Recap with it.
2. **No real tasks, no economic linkage.** Recap has its own tables. Nothing writes to `objectives`,
   `assignments`, `contracts`, `wallet_ledger`, `reward_issuances`, `funds` or any other economy table.
   No RPC from the lifecycle set is called. The values shown are illustrative figures the presenter typed.
3. **Email is in scope and real.** SendGrid is already wired. The step before sending shows a prewritten
   English email with the recap URL and the recipient list, editable, and the send actually happens from
   the tool.
4. **Per-recipient tokens.** One recap, one token per participant. Knowing who opened and who responded is
   the signal the tool exists to produce.
5. **Extraction goes through chi-orchestration**, not a new direct-OpenAI call site. GAP-08 is already open;
   a net-new feature must not widen it.

---

## 3. Surfaces

### `/admin/recap` — internal, gated

Gated on a real tenant role (`super_admin` or `admin`), not merely unlisted. Four steps:

1. **Upload.** Meeting title, organisation, date, presenter. Transcript drop field. A consent checkbox is a
   hard gate before extraction can run — see §6.
2. **Review.** Follow-ups grouped by person. Every field the extraction can get wrong is editable: the
   person's name, the title, the description, the value, and **who the follow-up belongs to**. A person can
   be added or taken off; a follow-up can be added or removed. The right column previews the real public page.
3. **Email.** Subject and body, with `{first_name}` and `{recap_url}` filled per person. The recipient list
   expands in place to the same editable rows as step 2, so a last correction doesn't require going back.
4. **Sent.** Per-recipient delivery state, each person's link, and later the open and response counts.
   A delete control removes the recap and takes every page offline.

The send button is gated on the same conditions as step 2, and the blocking condition is named: unnamed
people, untitled follow-ups, a person with no follow-ups, then missing addresses.

### `/recap/:token` — public, no login

Must render outside the `AppShell` auth guard. Sections in order:

- Who it's for, which call, which date, who prepared it.
- One paragraph on what Xcamp did with the recording.
- **Yours** — the recipient's follow-ups, each with an illustrative value and a
  **"That's mine" / "Not mine"** response.
- **The rest of the call** — everyone else's follow-ups, read-only, for context.
- **Where this would put you** — the projection, §5.
- Disclaimer, §6.
- CTA to `claas@xchange.eco`.
- Footer noting the transcript was not kept, with a delete link.

---

## 4. Data model

Own tables, in the existing Supabase project, following the established conventions: `tenant_id uuid NOT NULL
REFERENCES tenants`, RLS enabled, tenant-isolation policy mirroring `objectives`, and a `_migration_markers`
row per table.

- `recaps` — meeting title, organisation, call date, presenter, `created_by`, status
  (`draft` | `published` | `deleted`), `published_at`, `deleted_at`, `tenant_id`.
- `recap_recipients` — `recap_id`, name, email, role, `token text UNIQUE`, `email_status`
  (`queued` | `sent` | `failed`), `sent_at`, `first_opened_at`, `open_count`, `tenant_id`.
- `recap_items` — `recap_id`, `recipient_id`, title, description, `illustrative_value int`, due text,
  `sort_order`, `tenant_id`. Reassignment is an update to `recipient_id` — this is why items reference the
  recipient rather than being nested under them.
- `recap_responses` — `item_id`, `recipient_id`, `response` (`mine` | `not_mine`), `responded_at`,
  `tenant_id`. One row per item per recipient, last write wins.

**The raw transcript is never a column.** It is posted to the extraction endpoint, held in memory for the
duration of the call, and discarded. Nothing persists it, including logs.

Tokens are cryptographically random, at least 16 characters, and unguessable. Not sequential, not derived
from any id.

---

## 5. The projection — resolved

The mockup showed "0% today → 78% with these delivered". **That number has no defensible basis and must not
ship.** A prospect asked to trust a figure invented by the tool selling to them is the one thing that could
cost credibility with exactly this audience.

Replaced by two things that are genuinely derived from the recap the presenter just edited:

- **The five-stage spine.** Today: one segment filled (the call happened; nothing is structured). With these
  delivered: four of five. **Complete stays unfilled**, because settlement requires every participant to
  confirm, which no projection can assert.
- **The value on the table.** Today: `0 cr — notes in three inboxes`. With these delivered: the sum of the
  illustrative values the presenter set, across the number of people, `with proof attached and an assessor's
  sign-off`.

No quality percentage appears anywhere on the public page. The explanatory note under the projection still
says what certification is and why an investor cares — it just doesn't put a number on this prospect.

---

## 6. Guardrails

**Response is a signal, not an assignment.** These people have no account, no tenant and no agreement.
The wording stays outside the sketch / informational / committed vocabulary — "That's mine" / "Not mine",
never accept / decline. A response is recorded against the token and surfaced to the presenter. It creates
nothing.

**Consent is a gate, not fine print.** Extraction cannot run until the presenter confirms everyone on the
call was told it was transcribed and that a recap would be shared. Wording on the screen, not just in a
policy. This is a German company sending EU prospects a partially public page built from a recording of
named individuals.

**Deletion is real.** A deleted recap takes every page offline immediately and removes the rows. There is a
delete link in the public page footer too — a participant who wants it gone can say so.

**The public page renders no edit affordances**, carries an unambiguous disclaimer, and never implies
anyone has been assigned anything.

**Hand-added people.** A person added by hand may not have been on the call, so the page's framing has to
hold for them. Either the opening line softens, or hand-added recipients get a variant line. Decide during
the build; don't ship copy that's false for one recipient.

---

## 7. Open

- Where SendGrid is currently wired, and therefore where the send endpoint belongs. To be established in
  Phase 0, not assumed.
- Whether `/admin/recap` reuses the existing auth shell or needs its own gate, which depends on how the
  `/demo/*` auth-gate decision landed.
- Open and response tracking on the sent step is designed but its display can follow the first send.
