// P1.1 Part 5 — lightweight Companion view. Reference: xcamp-nox-founder-app's
// Chi Companion Home wasn't reachable from this session (out of GitHub scope
// for this repo set — see P1.1 session report), so this follows the P1.1
// mockup's own "lite" Companion pattern instead: a short illustrative
// transcript, not the full CompanionRail chat experience.
//
// src/fixtures/chat.ts's CHAT_MESSAGES is explicitly an Investor Dashboard
// (P1.6) transcript (portfolio/fund-toned questions) — reusing it here would
// put the wrong persona's voice on the Founder screen, so this uses its own
// short inline exchange instead, in the same Solari Energy / Kenya Power
// pilot context already established by the Founder Home composer's sample
// text (src/routes/demo.founder.index.tsx).
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Send } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// `seed` arrives from a Guided-mode start card (PersonaStartScreen) — its
// title/body becomes the first user message, and the card stays visible as
// a details container in the right column for the rest of the session.
const searchSchema = z.object({
  seed: z.string().optional(),
});

export const Route = createFileRoute("/demo/founder/companion")({
  head: () => ({ meta: [{ title: "Companion — Xcamp" }] }),
  validateSearch: searchSchema,
  component: FounderCompanionPage,
});

type ThreadMessage = { role: "user" | "assistant"; text: string };

const INITIAL_THREAD: ThreadMessage[] = [
  {
    role: "assistant",
    text: "Kenya Power's pilot has been open eleven days. Want me to draft the follow-up proposal from your site-visit notes?",
  },
  { role: "user", text: "What's blocking it right now?" },
  {
    role: "assistant",
    text: "Nothing formally — you just haven't sent it. I can turn the notes into a one-pager and queue it as a task for review.",
  },
];

function FounderCompanionPage() {
  const { seed } = Route.useSearch();
  const [thread, setThread] = useState<ThreadMessage[]>(() =>
    seed
      ? [
          { role: "user", text: seed },
          {
            role: "assistant",
            text: "Got it — want me to turn this into a task, or just keep talking it through?",
          },
        ]
      : INITIAL_THREAD,
  );
  const [draft, setDraft] = useState("");

  // A seed can change if the person goes back to /start and opens a
  // different card without a full page reload — reset the thread to match
  // rather than silently appending onto the previous card's conversation.
  useEffect(() => {
    if (!seed) return;
    setThread([
      { role: "user", text: seed },
      {
        role: "assistant",
        text: "Got it — want me to turn this into a task, or just keep talking it through?",
      },
    ]);
  }, [seed]);

  const handleSend = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    setThread((prev) => [
      ...prev,
      { role: "user", text },
      // Lighter build for the demo — no real Chi call here, just an
      // acknowledgement so the thread doesn't look like it swallowed the
      // message. The full Companion at /home has the real backend call.
      { role: "assistant", text: "Got it — noted for this project." },
    ]);
  };

  return (
    <div className="flex min-h-0 w-full flex-1 gap-6 overflow-hidden px-6 py-6">
      <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col overflow-y-auto">
        <h1 className="mb-1.5 text-xl font-semibold tracking-tight text-foreground">Companion</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          The same Chi, with room to go back and forth. A lighter build for the demo — the full
          Companion experience lives at <code className="text-xs">/home</code>.
        </p>

        <div className="flex flex-col gap-3">
          {thread.map((m, i) => (
            <div
              key={i}
              className={cn(
                "max-w-[88%] rounded-lg px-4 py-3 text-sm",
                m.role === "user" ? "self-end" : "self-start border",
              )}
              style={
                m.role === "user"
                  ? {
                      background:
                        "var(--skin-accent-wash, color-mix(in oklch, var(--skin-accent) 12%, transparent))",
                    }
                  : { borderColor: "var(--skin-line)" }
              }
            >
              {m.text}
            </div>
          ))}
        </div>

        <div className="mt-4 flex max-w-2xl gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSend();
            }}
            placeholder="Ask Chi about this project"
            className="rounded-full"
          />
          <Button
            size="icon"
            className="shrink-0 rounded-full"
            disabled={!draft.trim()}
            onClick={handleSend}
          >
            <Send size={15} />
          </Button>
        </div>
      </div>

      {/* Right-column detail container — only when arriving from a Guided
          start card (PersonaStartScreen); the regular Companion nav entry
          has no seed and stays single-column, unchanged. */}
      {seed && (
        <aside
          className="hidden w-80 shrink-0 overflow-y-auto rounded-xl border p-4 lg:block"
          style={{ borderColor: "var(--skin-line)", background: "var(--skin-surface2)" }}
        >
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Details
          </h2>
          <p className="text-sm" style={{ color: "var(--skin-ink)" }}>
            {seed}
          </p>
        </aside>
      )}
    </div>
  );
}
