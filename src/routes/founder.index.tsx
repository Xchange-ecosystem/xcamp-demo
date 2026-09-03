// P1.1 Part 1, 2, 3, 4 — Founder Home: input/upload composer, mock-processing
// -> proposal modal, action-item card feed, right-column metrics.
import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Paperclip, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CardFeed } from "@/components/card-feed/CardFeed";
import { founderActionItemConfig } from "@/components/card-feed/configs";
import type { CardFeedConfig } from "@/components/card-feed/types";
import { ProposalModal, type Proposal } from "@/components/founder/ProposalModal";
import { RightColumn } from "@/components/founder/RightColumn";
import { synthesizeEstimate } from "@/components/founder/proposalUtils";
import { getFeedByKind } from "@/fixtures/feed";
import type { FeedItem } from "@/fixtures/types";

export const Route = createFileRoute("/founder/")({
  head: () => ({ meta: [{ title: "Founder — Xcamp" }] }),
  component: FounderHomePage,
});

const SAMPLE_TEXT =
  "Kenya Power sent positive feedback after the site visit — let's get a follow-up proposal deck together and get the pilot signed.";

const SOURCE_LABEL: Record<string, string> = {
  "voice-note": "From your voice note",
  "email-forward": "Forwarded from an email",
  "text-input": "From your text update",
  upload: "From an uploaded file",
};

const PROCESSING_STEPS = [
  "Reading your update",
  "Matching it to an objective",
  "Drafting a proposal",
];

// Fallback assignee for composer-originated proposals, where there's no
// FeedItem.assigneeId to read from — Yuki Tanaka, the collaborator most
// active across the fixture data (see src/fixtures/feed.ts, wallet.ts).
const DEFAULT_ASSIGNEE_ID = "person-9";

function FounderHomePage() {
  const [items, setItems] = useState<FeedItem[]>(() => getFeedByKind("action_item"));
  const [draft, setDraft] = useState("");
  const [processing, setProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(-1);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openProposalFromItem = (item: FeedItem) => {
    const estimate = synthesizeEstimate(item.id);
    setProposal({
      id: item.id,
      title: item.title,
      sourceLabel: SOURCE_LABEL[String(item.meta?.source ?? "")] ?? "Suggested from your activity",
      assigneeId: item.assigneeId ?? DEFAULT_ASSIGNEE_ID,
      time: estimate.time,
      value: estimate.value,
    });
  };

  const dismissItem = (item: FeedItem) => {
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    toast("Dismissed", { description: item.title });
  };

  const founderFeedConfig: CardFeedConfig<FeedItem> = {
    ...founderActionItemConfig,
    getActions: (item) =>
      item.status === "completed" || item.status === "done"
        ? []
        : [
            { key: "review", label: "Review", variant: "default", onClick: openProposalFromItem },
            { key: "dismiss", label: "Dismiss", variant: "ghost", onClick: dismissItem },
          ],
  };

  const runProcessing = (text: string) => {
    const seed = text.trim();
    if (!seed) return;
    setDraft("");
    setProcessing(true);
    setProcessingStep(0);

    PROCESSING_STEPS.forEach((_, i) => {
      setTimeout(() => setProcessingStep(i), i * 550);
    });

    setTimeout(
      () => {
        setProcessing(false);
        setProcessingStep(-1);
        const estimate = synthesizeEstimate(seed);
        setProposal({
          id: `draft-${Date.now()}`,
          title: seed.length > 72 ? `${seed.slice(0, 72)}…` : seed,
          sourceLabel: "Read from your update · matched to an open objective",
          assigneeId: DEFAULT_ASSIGNEE_ID,
          time: estimate.time,
          value: estimate.value,
        });
      },
      PROCESSING_STEPS.length * 550 + 200,
    );
  };

  const handleAccept = (accepted: Proposal) => {
    setProposal(null);
    setItems((prev) => {
      const existing = prev.find((i) => i.id === accepted.id);
      const next: FeedItem = {
        id: existing?.id ?? accepted.id,
        kind: "action_item",
        title: accepted.title,
        description: `Assigned to this task · ~${accepted.time} · ${accepted.value} cr`,
        projectId: existing?.projectId ?? "proj-1",
        actorId: existing?.actorId ?? "person-1",
        assigneeId: accepted.assigneeId,
        status: "active",
        timestamp: new Date().toISOString(),
        meta: { source: "composer" },
      };
      const withoutExisting = prev.filter((i) => i.id !== next.id);
      return [next, ...withoutExisting];
    });
    toast.success("Accepted as an active task");
  };

  const handleDismissProposal = (p: Proposal) => {
    setProposal(null);
    toast("Proposal dismissed", { description: p.title });
  };

  return (
    <div className="flex flex-col gap-6 px-6 py-6 lg:flex-row lg:items-start lg:gap-8">
      <section className="min-w-0 flex-1">
        <h1 className="mb-4 text-2xl font-semibold tracking-tight text-foreground">
          Good morning, Maren.{" "}
          <span className="font-normal text-muted-foreground">Here's what moved.</span>
        </h1>

        {/* Part 1 — input/upload composer */}
        <div
          className="rounded-2xl border p-4 shadow-sm transition-shadow focus-within:shadow-md"
          style={{
            borderColor: "var(--skin-line)",
            background: "var(--skin-surface, var(--card))",
          }}
        >
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            placeholder="What moved today? Type it, paste a transcript, or drop a file."
            className="resize-none border-none bg-transparent px-0 shadow-none text-base focus-visible:ring-0"
          />
          <div className="flex items-center gap-2 pt-2">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setDraft(file.name);
                e.target.value = "";
              }}
            />
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Paperclip size={14} /> Attach a file
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDraft(SAMPLE_TEXT)}>
              Paste an update
            </Button>
            <Button
              size="sm"
              className="ml-auto"
              disabled={!draft.trim() || processing}
              onClick={() => runProcessing(draft)}
            >
              Send to Chi <Send size={14} />
            </Button>
          </div>
        </div>
        <p className="mt-2 px-1 text-xs text-muted-foreground">
          Chi reads it, matches it to an objective, and proposes the work. You decide what lands.
        </p>

        {/* Part 4 — mock-processing state */}
        {processing && (
          <div className="mt-3.5 rounded-lg border p-4" style={{ borderColor: "var(--skin-line)" }}>
            <div className="flex items-center gap-2.5 text-sm font-semibold">
              <span
                className="h-2 w-2 animate-pulse rounded-full"
                style={{ background: "var(--skin-accent)" }}
              />
              Chi is working on it
            </div>
            <ul className="mt-2.5 flex flex-col gap-1.5">
              {PROCESSING_STEPS.map((step, i) => (
                <li
                  key={step}
                  className="flex items-center gap-2 text-sm"
                  style={{
                    color:
                      i < processingStep
                        ? "var(--skin-ink, var(--foreground))"
                        : i === processingStep
                          ? "var(--skin-ink-soft, var(--muted-foreground))"
                          : "var(--skin-ink-faint, var(--muted-foreground))",
                  }}
                >
                  <span
                    className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{
                      background: i <= processingStep ? "var(--skin-accent)" : "var(--skin-line)",
                    }}
                  />
                  {step}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Part 2 — action-item card feed */}
        <div className="mb-2.5 mt-7 flex items-baseline gap-2.5">
          <h2 className="text-[15px] font-semibold tracking-tight text-foreground">
            Since you were last here
          </h2>
          <span className="text-sm text-muted-foreground">{items.length} items</span>
        </div>
        <CardFeed items={items} config={founderFeedConfig} />
      </section>

      {/* Part 3 — right column */}
      <RightColumn />

      <ProposalModal
        proposal={proposal}
        onOpenChange={(open) => !open && setProposal(null)}
        onAccept={handleAccept}
        onDismiss={handleDismissProposal}
      />
    </div>
  );
}
