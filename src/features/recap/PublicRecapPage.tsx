// Recap — the public page behind /recap/:token.
//
// No authentication of any kind. Someone clicks a link in an email and this
// has to work: no Xcamp account, no session, no AppShell. The token in the URL
// is the whole credential, and `get_recap_by_token` is SECURITY DEFINER with
// EXECUTE granted to `anon`, which is the only reason the anon key can read
// anything here — the three recap tables have RLS on with no policies at all.
//
// `get_recap_by_token` returns every follow-up on the session, and
// `recap_followups` has no recipient_id. The only link between a follow-up and
// a person is the free-text `owner_name`, so "yours" is a name match made
// here, and everyone else's are shown below as read-only context.
//
// Accept and Dismiss are deliberately LOCAL ONLY — no network call, no
// persistence, gone on reload. Accept opens an explanatory modal that names
// these as example tasks and points at a sales contact, so it means "tell me
// more about Xcamp", not "this task is mine". `set_recap_response` (and the
// `recap_recipients.response` column behind it) is therefore left uncalled:
// firing it here would record task ownership that nobody actually claimed.
// The RPC still exists and is still granted to `anon` if a genuine internal
// use for the signal comes back.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Undo2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useBrand } from "@/lib/brand";
import { getRecapByToken, type PublicRecap, type PublicRecapFollowup } from "@/lib/recap-api";

const CONTACT_EMAIL = "claas@xchange.eco";

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

  // Local-only interaction state. Nothing here is sent anywhere or survives a
  // reload, by design — see the note at the top of this file.
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(new Set());
  const [acceptOpen, setAcceptOpen] = useState(false);

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
        setState("ready");
      })
      .catch((err: unknown) => {
        setLoadError((err as Error).message);
        setState("error");
      });
  }, [token]);

  const toggleDismissed = useCallback((id: string) => {
    setDismissed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const { mine, theirs } = useMemo(() => {
    if (!recap) return { mine: [], theirs: [] as PublicRecapFollowup[] };
    return {
      mine: recap.followups.filter((f) => isOwnedBy(f.owner_name, recap.recipient.name)),
      theirs: recap.followups.filter((f) => !isOwnedBy(f.owner_name, recap.recipient.name)),
    };
  }, [recap]);

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

  const { session, recipient } = recap;
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
        <SectionHeading>Your suggested Xcamp tasks</SectionHeading>
        {mine.length > 0 ? (
          <div className="mt-3 flex flex-col gap-2.5">
            {mine.map((f) => (
              <FollowupCard
                key={f.id}
                followup={f}
                showOwner={false}
                dismissed={dismissed.has(f.id)}
                onAccept={() => setAcceptOpen(true)}
                onToggleDismissed={() => toggleDismissed(f.id)}
              />
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm" style={{ color: "var(--skin-ink-soft)" }}>
            Nothing on the call was noted as yours. The rest of what was agreed is below, for
            context.
          </p>
        )}
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
          Any figures shown are proposed values, taken from what was said on the call. They are not
          a quote, an invoice or an agreement.
        </p>
      </footer>

      <AcceptDialog open={acceptOpen} onOpenChange={setAcceptOpen} />
    </Frame>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  const brand = useBrand();
  return (
    <div className="min-h-screen w-full" style={{ background: "var(--skin-surface)" }}>
      <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
        <img
          src={brand.logoUrl}
          alt={brand.name}
          className="mb-8 h-6 w-auto sm:h-8"
          // A recipient may never have heard of Xcamp before this page. The
          // mark is the first thing establishing who sent it.
        />
        {children}
      </div>
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
  dismissed = false,
  onAccept,
  onToggleDismissed,
}: {
  followup: PublicRecapFollowup;
  showOwner: boolean;
  dismissed?: boolean;
  onAccept?: () => void;
  onToggleDismissed?: () => void;
}) {
  // Only the recipient's own tasks are actionable. Accepting or dismissing
  // somebody else's would not mean anything.
  const actionable = Boolean(onAccept && onToggleDismissed);

  return (
    <article
      className="rounded-xl p-4 transition-opacity"
      style={{
        background: "var(--skin-bg)",
        border: "1px solid var(--skin-line)",
        opacity: dismissed ? 0.55 : 1,
      }}
    >
      {showOwner && (
        <p
          className="mb-1 text-[11px] uppercase tracking-wide"
          style={{ color: "var(--skin-ink-faint)" }}
        >
          {followup.owner_name}
        </p>
      )}
      <h3
        className="text-sm font-medium"
        style={{
          color: "var(--skin-ink)",
          textDecoration: dismissed ? "line-through" : undefined,
        }}
      >
        {followup.task_title}
      </h3>
      {followup.task_description && (
        <p className="mt-1 text-[13px] leading-relaxed" style={{ color: "var(--skin-ink-soft)" }}>
          {followup.task_description}
        </p>
      )}
      {followup.illustrative_value !== null && (
        <p className="mt-2 text-[13px]" style={{ color: "var(--skin-ink-soft)" }}>
          Proposed value{" "}
          <span style={{ color: "var(--skin-ink)", fontWeight: 500 }}>
            {followup.illustrative_value.toLocaleString()}
          </span>
        </p>
      )}

      {actionable && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {dismissed ? (
            <>
              <span className="text-[13px]" style={{ color: "var(--skin-ink-faint)" }}>
                Dismissed
              </span>
              <button
                type="button"
                onClick={onToggleDismissed}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px]"
                style={{ border: "1px solid var(--skin-line)", color: "var(--skin-ink)" }}
              >
                <Undo2 className="h-3.5 w-3.5" />
                Undo
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onAccept}
                className="rounded-full px-4 py-1.5 text-[13px] font-medium"
                style={{
                  background: "var(--skin-accent)",
                  color: "var(--skin-on-accent)",
                  border: "1px solid var(--skin-accent)",
                }}
              >
                Accept
              </button>
              <button
                type="button"
                onClick={onToggleDismissed}
                className="rounded-full px-4 py-1.5 text-[13px]"
                style={{ border: "1px solid var(--skin-line)", color: "var(--skin-ink)" }}
              >
                Dismiss
              </button>
            </>
          )}
        </div>
      )}
    </article>
  );
}

function AcceptDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>About these tasks</DialogTitle>
          <DialogDescription>
            This is an example task. If you want to use Xcamp as investor, operator, founder or
            collaborator contact{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="underline"
              style={{ color: "var(--skin-accent)" }}
            >
              {CONTACT_EMAIL}
            </a>{" "}
            for a follow-up.
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
