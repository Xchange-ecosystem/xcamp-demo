// Recap — the public page behind /recap/:token.
//
// No authentication of any kind. Someone clicks a link in an email and this
// has to work: no Xcamp account, no session, no AppShell. The token in the URL
// is the whole credential, and `get_recap_by_token` is SECURITY DEFINER with
// EXECUTE granted to `anon`, which is the only reason the anon key can read
// anything here — the three recap tables have RLS on with no policies at all.
//
// Two shapes of the live schema drive this page:
//
//   * `get_recap_by_token` returns every follow-up on the session, and
//     `recap_followups` has no recipient_id. The only link between a follow-up
//     and a person is the free-text `owner_name`, so "yours" is a name match
//     made here, and everything else is shown as context.
//   * `set_recap_response` writes one answer per recipient, not per follow-up
//     (`recap_recipients.response` is a single column). So the response
//     control is page-level. Last write wins.
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import {
  getRecapByToken,
  setRecapResponse,
  type PublicRecap,
  type PublicRecapFollowup,
  type RecapResponse,
} from "@/lib/recap-api";

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Whether a follow-up's free-text owner is this recipient. Exact match first,
 * then first names — extraction usually writes "Anna" where the recipient list
 * says "Anna Weber". Two people sharing a first name would both match; that is
 * the cost of the schema having no recipient_id, and the page is written so
 * that seeing an extra follow-up is harmless.
 */
function isOwnedBy(ownerName: string, recipientName: string) {
  const owner = normalize(ownerName);
  const recipient = normalize(recipientName);
  if (!owner || !recipient) return false;
  if (owner === recipient) return true;
  const ownerFirst = owner.split(" ")[0] ?? "";
  const recipientFirst = recipient.split(" ")[0] ?? "";
  return ownerFirst.length > 1 && ownerFirst === recipientFirst;
}

function formatMeetingDate(value: string | null) {
  if (!value) return null;
  try {
    return format(parseISO(value), "d MMMM yyyy");
  } catch {
    return value;
  }
}

export function PublicRecapPage({ token }: { token: string }) {
  const [state, setState] = useState<"loading" | "ready" | "unknown" | "error">("loading");
  const [recap, setRecap] = useState<PublicRecap | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [response, setResponse] = useState<RecapResponse | null>(null);
  const [saving, setSaving] = useState<RecapResponse | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // StrictMode runs effects twice in dev. The RPC is idempotent (opened_at is
  // coalesced server-side) but there's no reason to fire it twice.
  const requested = useRef(false);

  useEffect(() => {
    if (requested.current) return;
    requested.current = true;

    getRecapByToken(token)
      .then((data) => {
        if (!data) {
          setState("unknown");
          return;
        }
        setRecap(data);
        setResponse(data.recipient.response ?? null);
        setState("ready");
      })
      .catch((err: unknown) => {
        setLoadError((err as Error).message);
        setState("error");
      });
  }, [token]);

  const answer = useCallback(
    async (value: RecapResponse) => {
      setSaving(value);
      setSaveError(null);
      try {
        const ok = await setRecapResponse(token, value);
        if (!ok) throw new Error("That link is no longer valid.");
        setResponse(value);
      } catch (err) {
        setSaveError((err as Error).message);
      } finally {
        setSaving(null);
      }
    },
    [token],
  );

  if (state === "loading") {
    return (
      <Frame>
        <div className="flex items-center gap-2 text-sm" style={{ color: "var(--skin-ink-soft)" }}>
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading your recap…
        </div>
      </Frame>
    );
  }

  if (state === "unknown" || state === "error") {
    return (
      <Frame>
        <h1 className="text-lg font-semibold" style={{ color: "var(--skin-ink)" }}>
          {state === "unknown" ? "This link isn't valid" : "This recap couldn't be loaded"}
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--skin-ink-soft)" }}>
          {state === "unknown"
            ? "It may have been mistyped, or only part of the link was copied across from the email. Opening the original link again usually fixes it — otherwise reply to whoever sent it and they can send you a new one."
            : "Something went wrong at our end rather than yours. Refreshing usually works; if it doesn't, reply to whoever sent you the link."}
        </p>
        {loadError && (
          <p className="mt-3 text-xs" style={{ color: "var(--skin-ink-faint)" }}>
            {loadError}
          </p>
        )}
      </Frame>
    );
  }

  if (!recap) return null;

  const { session, recipient, followups } = recap;
  const mine = followups.filter((f) => isOwnedBy(f.owner_name, recipient.name));
  const theirs = followups.filter((f) => !isOwnedBy(f.owner_name, recipient.name));
  const meetingDate = formatMeetingDate(session.meeting_date);

  return (
    <Frame>
      <header>
        <p
          className="text-[11px] uppercase tracking-wide"
          style={{ color: "var(--skin-ink-faint)" }}
        >
          Follow-ups for {recipient.name}
        </p>
        <h1 className="mt-1.5 text-xl font-semibold" style={{ color: "var(--skin-ink)" }}>
          {session.title}
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--skin-ink-soft)" }}>
          {[session.organization, meetingDate].filter(Boolean).join(" · ")}
          {session.organization || meetingDate ? " · " : ""}
          Prepared by {session.presenter_name}
        </p>
      </header>

      <section className="mt-7">
        <SectionHeading>Yours</SectionHeading>
        {mine.length > 0 ? (
          <div className="mt-3 flex flex-col gap-2.5">
            {mine.map((f) => (
              <FollowupCard key={f.id} followup={f} showOwner={false} />
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm" style={{ color: "var(--skin-ink-soft)" }}>
            Nothing on the call was noted as yours. The rest of what was agreed is below, for
            context.
          </p>
        )}

        <div
          className="mt-4 rounded-xl p-4"
          style={{ background: "var(--skin-bg)", border: "1px solid var(--skin-line)" }}
        >
          <p className="text-sm" style={{ color: "var(--skin-ink)" }}>
            Does this look like yours?
          </p>
          <p className="mt-1 text-[13px]" style={{ color: "var(--skin-ink-soft)" }}>
            Your answer goes back to {session.presenter_name} so they can correct the record. It
            doesn&apos;t assign you anything and it doesn&apos;t commit you to anything.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <ResponseButton
              label="That's mine"
              value="mine"
              current={response}
              saving={saving}
              onClick={() => void answer("mine")}
            />
            <ResponseButton
              label="Not mine"
              value="not_mine"
              current={response}
              saving={saving}
              onClick={() => void answer("not_mine")}
            />
          </div>
          {response && !saving && (
            <p className="mt-2.5 text-[13px]" style={{ color: "var(--skin-ink-soft)" }}>
              Thanks — recorded as &ldquo;{response === "mine" ? "that's mine" : "not mine"}
              &rdquo;. You can change it at any time.
            </p>
          )}
          {saveError && (
            <p className="mt-2.5 text-[13px]" style={{ color: "var(--skin-bad)" }}>
              {saveError}
            </p>
          )}
        </div>
      </section>

      {theirs.length > 0 && (
        <section className="mt-8">
          <SectionHeading>The rest of the call</SectionHeading>
          <p className="mt-1 text-[13px]" style={{ color: "var(--skin-ink-soft)" }}>
            What everyone else agreed to, for context. Nothing here is yours to answer.
          </p>
          <div className="mt-3 flex flex-col gap-2.5">
            {theirs.map((f) => (
              <FollowupCard key={f.id} followup={f} showOwner />
            ))}
          </div>
        </section>
      )}

      <footer
        className="mt-9 border-t pt-4 text-[12px]"
        style={{ borderColor: "var(--skin-line)", color: "var(--skin-ink-faint)" }}
      >
        <p>
          This page was built from a recording of the call. The transcript itself was not kept — it
          was read once to pull out the points above and then discarded.
        </p>
        <p className="mt-1.5">
          Any figures shown are illustrative, taken from what was said on the call. They are not a
          quote, an invoice or an agreement.
        </p>
      </footer>
    </Frame>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full" style={{ background: "var(--skin-surface)" }}>
      <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-14">{children}</div>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[15px] font-semibold" style={{ color: "var(--skin-ink)" }}>
      {children}
    </h2>
  );
}

function FollowupCard({
  followup,
  showOwner,
}: {
  followup: PublicRecapFollowup;
  showOwner: boolean;
}) {
  return (
    <article
      className="rounded-xl p-4"
      style={{ background: "var(--skin-bg)", border: "1px solid var(--skin-line)" }}
    >
      {showOwner && (
        <p
          className="mb-1 text-[11px] uppercase tracking-wide"
          style={{ color: "var(--skin-ink-faint)" }}
        >
          {followup.owner_name}
        </p>
      )}
      <h3 className="text-sm font-medium" style={{ color: "var(--skin-ink)" }}>
        {followup.task_title}
      </h3>
      {followup.task_description && (
        <p className="mt-1 text-[13px] leading-relaxed" style={{ color: "var(--skin-ink-soft)" }}>
          {followup.task_description}
        </p>
      )}
      {followup.illustrative_value !== null && (
        <p className="mt-2 text-[13px]" style={{ color: "var(--skin-ink-soft)" }}>
          Illustrative value{" "}
          <span style={{ color: "var(--skin-ink)", fontWeight: 500 }}>
            {followup.illustrative_value.toLocaleString()}
          </span>
        </p>
      )}
    </article>
  );
}

function ResponseButton({
  label,
  value,
  current,
  saving,
  onClick,
}: {
  label: string;
  value: RecapResponse;
  current: RecapResponse | null;
  saving: RecapResponse | null;
  onClick: () => void;
}) {
  const selected = current === value;
  const busy = saving === value;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={saving !== null}
      aria-pressed={selected}
      className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-opacity disabled:opacity-60"
      style={{
        background: selected ? "var(--skin-accent)" : "transparent",
        color: selected ? "var(--skin-on-accent)" : "var(--skin-ink)",
        border: `1px solid ${selected ? "var(--skin-accent)" : "var(--skin-line)"}`,
        fontWeight: selected ? 500 : 400,
      }}
    >
      {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {label}
    </button>
  );
}
