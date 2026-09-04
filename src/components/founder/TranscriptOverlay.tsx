// P1.4 Part 1b — the transcript-to-assignments pipeline, as a large overlay
// over the Founder screen: Extract (real backend call) -> Review -> Preview
// -> simulated Send -> Ready to add.
//
// "Sending" here is a client-side simulation, not a real send: Part 3 (the
// email-send endpoint) is blocked on an email-provider decision (no provider
// exists in xcamp-backend today — see the session's Phase 0 report). Once
// Part 3 lands, only this step's implementation changes; the state machine,
// gating and vocabulary below stay the same.
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, Loader2, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  extractTranscript,
  TranscriptExtractionError,
  type ExtractedPerson,
} from "@/lib/transcripts-api";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import type { TranscriptFile } from "./ComposerModes";

const PIPE_STEPS = ["Extract", "Review", "Preview", "Send"] as const;
const EXTRACT_SUB_STEPS = [
  "Sending the transcript to Chi",
  "Pulling out tasks, owners and estimates",
  "Matching names to Xcamp accounts",
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Stage = "extracting" | "extract-error" | "review" | "confirm" | "sending" | "done";

interface SendStatus {
  personId: string;
  status: "pending" | "sent";
}

function stepIndexFor(stage: Stage): number {
  if (stage === "extracting" || stage === "extract-error") return 0;
  if (stage === "review") return 1;
  if (stage === "confirm") return 2;
  return 3;
}

export function TranscriptOverlay({
  file,
  onClose,
  onComplete,
}: {
  file: TranscriptFile;
  onClose: () => void;
  onComplete: (people: ExtractedPerson[]) => void;
}) {
  const [stage, setStage] = useState<Stage>("extracting");
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractSubStep, setExtractSubStep] = useState(0);
  const [people, setPeople] = useState<ExtractedPerson[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sendStatuses, setSendStatuses] = useState<SendStatus[]>([]);
  const reduceMotion = usePrefersReducedMotion();
  const reduceMotionRef = useRef(reduceMotion);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const extractionController = useRef<AbortController | null>(null);

  useEffect(() => {
    reduceMotionRef.current = reduceMotion;
  }, [reduceMotion]);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const runExtraction = useCallback(() => {
    extractionController.current?.abort();
    clearTimers();
    const controller = new AbortController();
    extractionController.current = controller;
    setStage("extracting");
    setExtractError(null);
    setExtractSubStep(0);

    const stepMs = reduceMotionRef.current ? 60 : 550;
    EXTRACT_SUB_STEPS.forEach((_, i) => {
      timers.current.push(setTimeout(() => setExtractSubStep(i), i * stepMs));
    });

    extractTranscript(file.text, controller.signal)
      .then((extracted) => {
        if (controller.signal.aborted) return;
        clearTimers();
        if (extractionController.current === controller) extractionController.current = null;
        setPeople(extracted);
        setSelectedId(extracted[0]?.id ?? null);
        setStage("review");
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        clearTimers();
        if (extractionController.current === controller) extractionController.current = null;
        const message =
          err instanceof TranscriptExtractionError
            ? err.message
            : "Something went wrong reading this transcript. Please try again.";
        setExtractError(message);
        setStage("extract-error");
      });
  }, [clearTimers, file.text]);

  useEffect(() => {
    runExtraction();
    return () => {
      extractionController.current?.abort();
      clearTimers();
    };
  }, [clearTimers, runExtraction]);

  const selected = people.find((p) => p.id === selectedId) ?? null;
  const taskCount = people.reduce((n, p) => n + p.tasks.length, 0);
  const missingCount = people.filter((p) => !EMAIL_RE.test(p.email)).length;
  const allAddressed = people.length > 0 && missingCount === 0;

  const updateEmail = (personId: string, email: string) => {
    setPeople((prev) => prev.map((p) => (p.id === personId ? { ...p, email } : p)));
  };

  const removeTask = (personId: string, taskId: string) => {
    const next = people
      .map((p) => (p.id === personId ? { ...p, tasks: p.tasks.filter((t) => t.id !== taskId) } : p))
      .filter((p) => p.tasks.length > 0);
    setPeople(next);
    if (!next.some((p) => p.id === selectedId)) setSelectedId(next[0]?.id ?? null);
  };

  const startSending = () => {
    clearTimers();
    setSendStatuses(people.map((p) => ({ personId: p.id, status: "pending" })));
    setStage("sending");
    const stepMs = reduceMotion ? 80 : 480;
    people.forEach((p, i) => {
      timers.current.push(
        setTimeout(
          () => {
            setSendStatuses((prev) =>
              prev.map((s) => (s.personId === p.id ? { ...s, status: "sent" } : s)),
            );
          },
          (i + 1) * stepMs,
        ),
      );
    });
    timers.current.push(setTimeout(() => setStage("done"), (people.length + 1) * stepMs + 200));
  };

  const finish = () => {
    onComplete(people);
  };

  const closeOverlay = () => {
    extractionController.current?.abort();
    clearTimers();
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && closeOverlay()}>
      <DialogContent
        className="flex h-[min(780px,92vh)] w-[min(1120px,96vw)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:rounded-2xl"
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Header + step spine */}
        <div
          className="flex flex-wrap items-center gap-4 border-b px-5 py-3.5"
          style={{ borderColor: "var(--skin-line-soft, var(--border))" }}
        >
          <DialogTitle className="text-[16px] font-semibold tracking-tight">
            Transcript to assignments
          </DialogTitle>
          <DialogDescription className="sr-only">
            Extract assignments from a transcript, review recipients, preview the result, and
            simulate sending it.
          </DialogDescription>
          <span
            className="text-[12.5px]"
            style={{ color: "var(--skin-ink-faint, var(--muted-foreground))" }}
          >
            {file.name}
          </span>
          <div className="flex items-center" aria-label="Progress">
            {PIPE_STEPS.map((s, i) => {
              const cur = stepIndexFor(stage);
              const state = i < cur ? "done" : i === cur ? "on" : "pending";
              return (
                <div key={s} className="flex items-center">
                  <div
                    data-step={s.toLowerCase()}
                    data-state={state}
                    aria-current={state === "on" ? "step" : undefined}
                    className="flex items-center gap-1.5 text-[12.5px]"
                    style={{
                      color:
                        state === "pending"
                          ? "var(--skin-ink-faint, var(--muted-foreground))"
                          : "var(--skin-ink, var(--foreground))",
                      fontWeight: state === "on" ? 600 : 400,
                    }}
                  >
                    <span
                      className="grid h-[19px] w-[19px] shrink-0 place-items-center rounded-full border text-[11px] font-bold"
                      style={{
                        borderColor:
                          state === "pending" ? "var(--skin-line)" : "var(--skin-accent)",
                        background: state === "done" ? "var(--skin-accent)" : "transparent",
                        color:
                          state === "done"
                            ? "var(--skin-accent-ink, white)"
                            : state === "on"
                              ? "var(--skin-accent)"
                              : undefined,
                      }}
                    >
                      {state === "done" ? "✓" : i + 1}
                    </span>
                    {s}
                  </div>
                  {i < PIPE_STEPS.length - 1 && (
                    <span
                      className="mx-2.5 h-px w-[22px]"
                      style={{ background: "var(--skin-line)" }}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={closeOverlay}
            aria-label="Close"
            className="ml-auto text-xl leading-none"
            style={{ color: "var(--skin-ink-soft, var(--muted-foreground))" }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {(stage === "extracting" || stage === "extract-error") && (
            <div
              className="mx-auto mt-8 max-w-[640px] rounded-lg border p-4"
              style={{ borderColor: "var(--skin-line)" }}
            >
              {stage === "extracting" ? (
                <>
                  <div className="flex items-center gap-2.5 text-sm font-semibold">
                    <Loader2
                      size={16}
                      className="animate-spin"
                      style={{ color: "var(--skin-accent)" }}
                    />
                    Chi is reading the transcript
                  </div>
                  <ul className="mt-2.5 flex flex-col gap-1.5">
                    {EXTRACT_SUB_STEPS.map((s, i) => (
                      <li
                        key={s}
                        className="flex items-center gap-2 text-sm"
                        style={{
                          color:
                            i < extractSubStep
                              ? "var(--skin-ink, var(--foreground))"
                              : i === extractSubStep
                                ? "var(--skin-ink-soft, var(--muted-foreground))"
                                : "var(--skin-ink-faint, var(--muted-foreground))",
                        }}
                      >
                        <span
                          className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{
                            background:
                              i <= extractSubStep ? "var(--skin-accent)" : "var(--skin-line)",
                          }}
                        />
                        {s}
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <>
                  <div
                    className="flex items-center gap-2.5 text-sm font-semibold"
                    style={{ color: "var(--skin-bad, #b04a41)" }}
                  >
                    <AlertTriangle size={16} />
                    Extraction failed
                  </div>
                  <p
                    className="mt-2 text-sm"
                    style={{ color: "var(--skin-ink-soft, var(--muted-foreground))" }}
                  >
                    {extractError}
                  </p>
                  <div className="mt-3.5 flex gap-2">
                    <Button size="sm" variant="outline" onClick={closeOverlay}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={runExtraction}>
                      Retry
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {stage === "review" && (
            <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_372px]">
              <section>
                <div className="mb-2.5 flex items-baseline gap-2.5">
                  <h3 className="text-[14.5px] font-semibold">Extracted work</h3>
                  <span
                    className="text-[12.5px]"
                    style={{ color: "var(--skin-ink-faint, var(--muted-foreground))" }}
                  >
                    {taskCount} tasks across {people.length}{" "}
                    {people.length === 1 ? "person" : "people"}
                  </span>
                </div>
                <div className="flex flex-col gap-2.5">
                  {people.map((p) => (
                    <PersonCard
                      key={p.id}
                      person={p}
                      selected={p.id === selectedId}
                      onSelect={() => setSelectedId(p.id)}
                      onEmailChange={(email) => updateEmail(p.id, email)}
                      onRemoveTask={(taskId) => removeTask(p.id, taskId)}
                    />
                  ))}
                </div>
              </section>

              <aside>
                <h3 className="mb-2.5 text-[14.5px] font-semibold">Email preview</h3>
                <div className="mb-2.5 flex flex-wrap gap-1.5">
                  {people.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedId(p.id)}
                      aria-pressed={p.id === selectedId}
                      className="rounded-full border px-2.5 py-1.5 text-[12.5px]"
                      style={{
                        borderColor:
                          p.id === selectedId ? "var(--skin-accent)" : "var(--skin-line)",
                        background:
                          p.id === selectedId
                            ? "var(--skin-accent-wash, color-mix(in oklch, var(--skin-accent) 12%, transparent))"
                            : "transparent",
                        fontWeight: p.id === selectedId ? 600 : 400,
                      }}
                    >
                      {p.name.split(" ")[0]}
                    </button>
                  ))}
                </div>
                {selected && <EmailPreview person={selected} />}
              </aside>
            </div>
          )}

          {stage === "confirm" && (
            <div className="mx-auto mt-4 max-w-[560px]">
              <h3 className="mb-1 text-[15px] font-semibold">Confirm and send</h3>
              <p
                className="mb-3 text-[13px]"
                style={{ color: "var(--skin-ink-soft, var(--muted-foreground))" }}
              >
                Demo send only — no email leaves the browser. Each recipient would get a sketch of
                their own tasks: informational only, with nothing locked.
              </p>
              <div className="flex flex-col">
                {people.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 border-b py-2.5 text-[13.5px] last:border-b-0"
                    style={{ borderColor: "var(--skin-line-soft, var(--border))" }}
                  >
                    <span className="min-w-0 flex-1">
                      {p.name}
                      <small
                        className="ml-1.5"
                        style={{ color: "var(--skin-ink-faint, var(--muted-foreground))" }}
                      >
                        {p.tasks.length} {p.tasks.length === 1 ? "task" : "tasks"}
                      </small>
                    </span>
                    <span
                      className="ml-auto text-[12.5px]"
                      style={{ color: "var(--skin-ink-soft, var(--muted-foreground))" }}
                    >
                      {p.email}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(stage === "sending" || stage === "done") && (
            <div className="mx-auto mt-4 max-w-[560px]">
              <h3 className="mb-3 text-[15px] font-semibold">
                {stage === "sending" ? "Simulating send" : "Ready to add"}
              </h3>
              <div className="flex flex-col">
                {people.map((p) => {
                  const s = sendStatuses.find((x) => x.personId === p.id);
                  const sent = s?.status === "sent";
                  return (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 border-b py-2.5 text-[13.5px] last:border-b-0"
                      style={{ borderColor: "var(--skin-line-soft, var(--border))" }}
                    >
                      <span className="min-w-0 flex-1">{p.name}</span>
                      <span
                        className="inline-flex items-center gap-1.5 text-[12.5px]"
                        style={{
                          color: sent
                            ? "var(--skin-good, #0f766e)"
                            : "var(--skin-ink-faint, var(--muted-foreground))",
                        }}
                      >
                        {sent ? (
                          <>
                            <Check size={14} /> Simulated
                          </>
                        ) : (
                          "Pending"
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
              {stage === "done" && (
                <p
                  className="mt-4 text-[13px]"
                  style={{ color: "var(--skin-ink-soft, var(--muted-foreground))" }}
                >
                  {people.length} sketch {people.length === 1 ? "assignment is" : "assignments are"}
                  ready to add to your feed as informational work. Nothing is locked until you
                  formalize an objective into an agreement.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {(stage === "review" || stage === "confirm") && (
          <div
            className="flex flex-wrap items-center gap-3 border-t px-5 py-3.5"
            style={{ borderColor: "var(--skin-line-soft, var(--border))" }}
          >
            <span
              className="min-w-[190px] flex-1 text-[13px]"
              style={{ color: "var(--skin-ink-soft, var(--muted-foreground))" }}
            >
              {stage === "review" &&
                (allAddressed ? (
                  <>All recipients have an address.</>
                ) : (
                  <>
                    <b className="text-foreground">{missingCount}</b> of {people.length} need a
                    valid email address.
                  </>
                ))}
            </span>
            {stage === "review" ? (
              <>
                <Button size="sm" variant="outline" onClick={closeOverlay}>
                  Cancel
                </Button>
                <Button size="sm" disabled={!allAddressed} onClick={() => setStage("confirm")}>
                  Build previews
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="outline" onClick={() => setStage("review")}>
                  Back
                </Button>
                <Button size="sm" onClick={startSending}>
                  Simulate {people.length} {people.length === 1 ? "email" : "emails"}
                </Button>
              </>
            )}
          </div>
        )}
        {stage === "done" && (
          <div
            className="flex justify-end border-t px-5 py-3.5"
            style={{ borderColor: "var(--skin-line-soft, var(--border))" }}
          >
            <Button size="sm" onClick={finish}>
              Add to feed
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PersonCard({
  person,
  selected,
  onSelect,
  onEmailChange,
  onRemoveTask,
}: {
  person: ExtractedPerson;
  selected: boolean;
  onSelect: () => void;
  onEmailChange: (email: string) => void;
  onRemoveTask: (taskId: string) => void;
}) {
  const emailValid = EMAIL_RE.test(person.email);
  return (
    <div
      className="relative overflow-hidden rounded-lg border p-3.5 pl-4"
      style={{
        background: "var(--skin-raised, var(--muted))",
        borderColor: selected ? "var(--skin-accent)" : "var(--skin-line-soft, var(--border))",
      }}
    >
      <span
        className="absolute inset-y-0 left-0 w-[2px]"
        style={{
          background: person.matched
            ? selected
              ? "var(--skin-accent)"
              : "transparent"
            : "var(--skin-warn, #a96a22)",
        }}
      />
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onSelect}
          aria-pressed={selected}
          aria-label={`Preview email for ${person.name}`}
          className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
        >
          <span
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[12px] font-bold"
            style={{
              background: "var(--skin-surface, var(--card))",
              border: "1px solid var(--skin-line)",
            }}
          >
            {person.initials}
          </span>
          <span className="min-w-0 flex-1">
            <b className="block truncate text-[14px] font-semibold">{person.name}</b>
            {person.role && (
              <small
                className="text-[12px]"
                style={{ color: "var(--skin-ink-faint, var(--muted-foreground))" }}
              >
                {person.role}
              </small>
            )}
          </span>
        </button>
        <span
          className="whitespace-nowrap rounded-md px-2 py-0.5 text-[12px]"
          style={
            person.matched
              ? {
                  background:
                    "var(--skin-accent-wash, color-mix(in oklch, var(--skin-accent) 12%, transparent))",
                  color: "var(--skin-good, #0f766e)",
                }
              : {
                  background:
                    "var(--skin-accent-wash, color-mix(in oklch, var(--skin-accent) 12%, transparent))",
                  color: "var(--skin-warn, #a96a22)",
                }
          }
        >
          {person.matched ? "matched" : "no account — check the address"}
        </span>
      </div>
      <div className="mt-2.5 flex items-center gap-2">
        <label
          htmlFor={`mail-${person.id}`}
          className="w-12 shrink-0 text-[12px]"
          style={{ color: "var(--skin-ink-soft, var(--muted-foreground))" }}
        >
          Email
        </label>
        <input
          id={`mail-${person.id}`}
          type="email"
          value={person.email}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder="Not set — type their address"
          className="flex-1 rounded-md border px-2.5 py-1.5 text-[13px] outline-none"
          style={{
            background: "var(--skin-surface, var(--card))",
            borderColor:
              person.email && !emailValid ? "var(--skin-warn, #a96a22)" : "var(--skin-line)",
          }}
        />
      </div>
      <ul className="mt-2.5 flex flex-col gap-1.5">
        {person.tasks.map((t) => (
          <li
            key={t.id}
            className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px]"
            style={{ background: "var(--skin-surface, var(--card))" }}
          >
            <span className="min-w-0 flex-1 truncate">{t.title}</span>
            {t.est && (
              <span
                className="whitespace-nowrap text-[12px] tabular-nums"
                style={{ color: "var(--skin-ink-soft, var(--muted-foreground))" }}
              >
                {t.est}
              </span>
            )}
            <span
              className="whitespace-nowrap text-[12px]"
              style={{ color: "var(--skin-ink-faint, var(--muted-foreground))" }}
            >
              {t.due}
            </span>
            <button
              type="button"
              onClick={() => onRemoveTask(t.id)}
              aria-label={`Remove ${t.title}`}
              className="px-0.5 text-base leading-none"
              style={{ color: "var(--skin-ink-faint, var(--muted-foreground))" }}
            >
              <X size={14} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// The email preview is an inbox, not app chrome — it stays on a white
// background in both light and dark mode. Never theme this with skin tokens.
function EmailPreview({ person }: { person: ExtractedPerson }) {
  return (
    <div
      className="overflow-hidden rounded-lg border"
      style={{ borderColor: "var(--skin-line)", background: "#ffffff" }}
    >
      <div
        className="border-b px-3.5 py-2.5 text-[12px]"
        style={{ background: "#f3f4f6", borderColor: "#e5e7eb", color: "#4b5563" }}
      >
        <div className="flex gap-1.5 py-px">
          <span className="font-semibold" style={{ color: "#111827" }}>
            From:
          </span>
          Xcamp &lt;chi@xcamp.eco&gt;
        </div>
        <div className="flex gap-1.5 py-px">
          <span className="font-semibold" style={{ color: "#111827" }}>
            To:
          </span>
          {person.email || "Not set"}
        </div>
        <div className="flex gap-1.5 py-px">
          <span className="font-semibold" style={{ color: "#111827" }}>
            Subject:
          </span>
          Your tasks from today's meeting
        </div>
      </div>
      <div className="px-5 py-5" style={{ color: "#111827" }}>
        <div
          className="mb-4 grid h-6.5 w-6.5 place-items-center rounded-lg text-[13px] font-bold text-white"
          style={{ background: "#0F766E", width: 26, height: 26 }}
        >
          X
        </div>
        <h4 className="mb-2.5 text-[16px] font-semibold tracking-tight">
          Hi {person.name.split(" ")[0]},
        </h4>
        <p className="mb-3 text-[13px] leading-[1.55]" style={{ color: "#374151" }}>
          From today's meeting, Chi sketched out the following tasks for you. Nothing here is locked
          in — this is informational until the project owner formalizes it into an agreement.
        </p>
        <ul className="mb-4 border-t" style={{ borderColor: "#e5e7eb" }}>
          {person.tasks.map((t) => (
            <li
              key={t.id}
              className="border-b py-2.5 text-[13px]"
              style={{ borderColor: "#e5e7eb", color: "#111827" }}
            >
              {t.title}
              <span className="mt-0.5 block text-[11.5px]" style={{ color: "#6b7280" }}>
                {[t.est, t.due].filter(Boolean).join(" · ")}
              </span>
            </li>
          ))}
        </ul>
        <div
          className="mb-4 rounded-md px-3.5 py-2.5 text-[12px] leading-[1.5]"
          style={{ background: "#f0fdfa", borderLeft: "3px solid #0F766E", color: "#134e4a" }}
        >
          These are sketch assignments with informational value — nothing is owed, and no credits
          are reserved, until the project owner turns this into a formal agreement.
        </div>
        <span
          className="inline-block rounded-lg px-4 py-2 text-[12.5px] font-semibold text-white"
          style={{ background: "#0F766E" }}
        >
          View in Xcamp
        </span>
        <div className="mt-4 text-[11px]" style={{ color: "#9ca3af" }}>
          Sent by Xcamp on behalf of your team.
        </div>
      </div>
    </div>
  );
}
