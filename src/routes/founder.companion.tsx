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
// text (src/routes/founder.index.tsx).
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/founder/companion")({
  head: () => ({ meta: [{ title: "Companion — Xcamp" }] }),
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
  const [thread, setThread] = useState<ThreadMessage[]>(INITIAL_THREAD);
  const [draft, setDraft] = useState("");

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
    <div className="mx-auto max-w-2xl px-6 py-6">
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
  );
}
