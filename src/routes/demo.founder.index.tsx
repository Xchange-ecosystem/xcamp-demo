// P1.1 Part 1, 2, 3, 4 — Founder Home: input/upload composer, mock-processing
// -> proposal modal, action-item card feed, right-column metrics.
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  FileText,
  Handshake,
  Lightbulb,
  Loader2,
  Paperclip,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CardFeed } from "@/components/card-feed/CardFeed";
import { founderActionItemConfig } from "@/components/card-feed/configs";
import type { CardFeedConfig, CardFeedItemVisual } from "@/components/card-feed/types";
import { ProposalModal, type Proposal } from "@/components/founder/ProposalModal";
import { RightColumn } from "@/components/founder/RightColumn";
import { matchObjective, synthesizeEstimate } from "@/components/founder/proposalUtils";
import {
  InertModeBody,
  ModePillRow,
  TranscriptSimBody,
  type InputMode,
  type PendingFile,
} from "@/components/founder/ComposerModes";
import { MODE_HINTS } from "@/components/founder/composerModes.constants";
import { pickTranscriptExtractions } from "@/fixtures/transcriptExtractionPool";
import { getFeedByKind } from "@/fixtures/feed";
import type { FeedItem } from "@/fixtures/types";

export const Route = createFileRoute("/demo/founder/")({
  head: () => ({ meta: [{ title: "Founder — Xcamp" }] }),
  component: FounderHomePage,
});

const SAMPLE_TEXT =
  "Kenya Power sent positive feedback after the site visit — let's get a follow-up proposal deck together and get the pilot signed.";

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
  const processingTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Part 1a — composer input modes. Selection persists within the session;
  // only Text and Transcript are wired to anything.
  const [inputMode, setInputMode] = useState<InputMode>("text");

  // B3 — Transcript tab: fixture-only, content-blind simulation. Nothing
  // typed or dropped here is ever read; see transcriptExtractionPool.ts.
  const [transcriptText, setTranscriptText] = useState("");
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const nextPendingFileId = useRef(0);
  const nextTranscriptItemId = useRef(0);
  const transcriptTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      processingTimers.current.forEach(clearTimeout);
      if (transcriptTimer.current) clearTimeout(transcriptTimer.current);
    },
    [],
  );

  const openProposalFromItem = (item: FeedItem) => {
    const estimate = synthesizeEstimate(item.id);
    const objective = matchObjective(item.id, item.projectId);
    setProposal({
      id: item.id,
      title: item.title,
      sourceLabel: `Read from your update · matched to the ${objective.title} objective`,
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
    // Agreement-lifecycle badge instead of founderActionItemConfig's
    // done/active status badge — every action item now carries
    // `agreementState`, so this replaces rather than falls back to it.
    getVisual: (item): CardFeedItemVisual => {
      switch (item.agreementState) {
        case "settled":
          return { icon: CheckCircle2, badgeLabel: "Settled", accent: "var(--skin-good)" };
        case "agreement":
          return { icon: Handshake, badgeLabel: "Under agreement", accent: "var(--skin-accent)" };
        default:
          return { icon: Lightbulb, badgeLabel: "Added as a sketch", accent: "var(--skin-accent)" };
      }
    },
    getMeta: (item) => {
      const entries = founderActionItemConfig.getMeta?.(item) ?? [];
      if (typeof item.meta?.time === "string") {
        entries.push({ key: "time", label: `~${item.meta.time}` });
      }
      if (typeof item.meta?.value === "number") {
        entries.push({ key: "value", label: `${item.meta.value} cr · informational` });
      }
      if (item.meta?.source === "transcript") {
        entries.push({ key: "transcript-source", label: "From transcript", icon: FileText });
      }
      return entries;
    },
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
    processingTimers.current.forEach(clearTimeout);
    processingTimers.current = [];

    PROCESSING_STEPS.forEach((_, i) => {
      processingTimers.current.push(setTimeout(() => setProcessingStep(i), i * 550));
    });

    processingTimers.current.push(
      setTimeout(
        () => {
          setProcessing(false);
          setProcessingStep(-1);
          const estimate = synthesizeEstimate(seed);
          const objective = matchObjective(seed);
          setProposal({
            id: `draft-${Date.now()}`,
            title: seed.length > 72 ? `${seed.slice(0, 72)}…` : seed,
            sourceLabel: `Read from your update · matched to the ${objective.title} objective`,
            assigneeId: DEFAULT_ASSIGNEE_ID,
            time: estimate.time,
            value: estimate.value,
          });
        },
        PROCESSING_STEPS.length * 550 + 200,
      ),
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
        description: `${accepted.value} cr is informational until the objective is formalized into an agreement.`,
        projectId: existing?.projectId ?? "proj-1",
        actorId: existing?.actorId ?? "person-1",
        assigneeId: accepted.assigneeId,
        status: "active",
        agreementState: "sketch",
        timestamp: new Date().toISOString(),
        meta: { source: "composer", time: accepted.time, value: accepted.value },
      };
      const withoutExisting = prev.filter((i) => i.id !== next.id);
      return [next, ...withoutExisting];
    });
    toast.success("Accepted as a sketch · informational");
  };

  const addPendingFiles = (fileList: FileList) => {
    const additions: PendingFile[] = Array.from(fileList).map((file) => ({
      id: `pending-${Date.now()}-${nextPendingFileId.current++}`,
      name: file.name,
      size: file.size,
      type: file.type,
    }));
    setPendingFiles((prev) => [...prev, ...additions]);
  };

  const removePendingFile = (id: string) => {
    setPendingFiles((prev) => prev.filter((f) => f.id !== id));
  };

  // B3 — content-blind by design: `transcriptText` and `pendingFiles` are
  // never read here, only cleared once the (simulated) extraction finishes.
  const runTranscriptExtraction = () => {
    if (transcriptTimer.current) clearTimeout(transcriptTimer.current);
    setTranscriptLoading(true);
    const delay = 1400 + Math.random() * 900;
    transcriptTimer.current = setTimeout(() => {
      const picks = pickTranscriptExtractions();
      const now = new Date().toISOString();
      const newItems: FeedItem[] = picks.map((p) => ({
        id: `transcript-${Date.now()}-${nextTranscriptItemId.current++}`,
        kind: "action_item",
        title: p.title,
        description: p.description,
        projectId: p.projectId,
        actorId: "person-1",
        assigneeId: p.assigneeId,
        status: "active",
        agreementState: p.agreementState,
        timestamp: now,
        meta: { source: "transcript" },
      }));
      setItems((prev) => [...newItems, ...prev]);
      setTranscriptLoading(false);
      setTranscriptText("");
      setPendingFiles([]);
      setInputMode("text");
      toast.success(
        `Chi extracted ${newItems.length} item${newItems.length === 1 ? "" : "s"} from your transcript`,
        { description: "Added to your feed below — review when ready." },
      );
    }, delay);
  };

  const handleDismissProposal = (p: Proposal) => {
    setProposal(null);
    // Dismissing a proposal opened via a card's "Review" action should drop
    // that card too — otherwise it stays in the feed contradicting the
    // "Proposal dismissed" toast. Composer-originated drafts (id prefixed
    // "draft-") were never added to `items`, so there's nothing to remove.
    if (!p.id.startsWith("draft-")) {
      setItems((prev) => prev.filter((i) => i.id !== p.id));
    }
    toast("Proposal dismissed", { description: p.title });
  };

  return (
    <div className="flex flex-col gap-6 px-6 py-6 lg:flex-row lg:items-start lg:gap-8">
      <section className="min-w-0 flex-1">
        <h1 className="mb-4 text-2xl font-semibold tracking-tight text-foreground">
          Good morning, Maren.{" "}
          <span className="font-normal text-muted-foreground">Here's what moved.</span>
        </h1>

        {/* Part 1a — composer input modes */}
        <ModePillRow mode={inputMode} onModeChange={setInputMode} />

        {/* Part 1 — input/upload composer */}
        {inputMode === "text" ? (
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
            <div className="flex flex-wrap items-center gap-2 pt-2">
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
        ) : inputMode === "transcript" ? (
          <div
            className="rounded-2xl border p-4 shadow-sm"
            style={{
              borderColor: "var(--skin-line)",
              background: "var(--skin-surface, var(--card))",
            }}
          >
            <TranscriptSimBody
              text={transcriptText}
              onTextChange={setTranscriptText}
              files={pendingFiles}
              onFilesAdded={addPendingFiles}
              onFileRemoved={removePendingFile}
              loading={transcriptLoading}
              onSend={runTranscriptExtraction}
            />
          </div>
        ) : (
          <InertModeBody mode={inputMode} />
        )}
        <p className="mt-2 px-1 text-xs text-muted-foreground">{MODE_HINTS[inputMode]}</p>

        {transcriptLoading && inputMode === "transcript" && (
          <div
            className="mt-3.5 flex items-center gap-2.5 rounded-lg border p-4"
            style={{ borderColor: "var(--skin-line)" }}
          >
            <Loader2 size={16} className="animate-spin" style={{ color: "var(--skin-accent)" }} />
            <span
              className="text-sm font-medium"
              style={{ color: "var(--skin-ink-soft, var(--muted-foreground))" }}
            >
              Chi is reading your transcript…
            </span>
          </div>
        )}

        {/* Part 4 — mock-processing state */}
        {processing && inputMode === "text" && (
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
