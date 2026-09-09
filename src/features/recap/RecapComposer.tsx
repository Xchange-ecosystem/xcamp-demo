// Recap — the internal, post-call flow behind /admin/recap.
//
// Setup -> Transcript -> Review -> Recipients -> Email -> Send.
//
// Nothing is persisted until Send. Extraction is stateless (the transcript is
// posted to api/recap/extract and never stored), and every edit made in the
// Review step is edited client-side, so what api/recap/publish writes is
// exactly what is on screen at the moment Send is pressed.
//
// Send is irreversible: real Supabase rows, real SendGrid email, no unsend and
// no edit-after-send. Hence the confirmation dialog.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Check, Copy, FileText, Loader2, Plus, Upload, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  extractFollowups,
  publishRecap,
  RecapApiError,
  type ExtractedFollowup,
  type PublishRecapResult,
} from "@/lib/recap-api";
import {
  describeFile,
  readTranscriptFile,
  TRANSCRIPT_ACCEPT,
  TranscriptFileError,
} from "./transcriptFile";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const STEPS = [
  { key: "setup", label: "Setup" },
  { key: "transcript", label: "Transcript" },
  { key: "review", label: "Review" },
  { key: "recipients", label: "Recipients" },
  { key: "email", label: "Email" },
] as const;

type Step = (typeof STEPS)[number]["key"];

interface FollowupDraft {
  key: string;
  owner_name: string;
  task_title: string;
  task_description: string;
  /**
   * Held as a string while editing so the field can be genuinely empty.
   *
   * Labelled "Proposed value" on screen. The name stays `illustrative_value`
   * because that is the column in `recap_followups` and the field
   * `api/recap/publish.ts` accepts — the label was renamed, the wire format
   * was not.
   */
  illustrative_value: string;
}

interface RecipientDraft {
  key: string;
  name: string;
  email: string;
}

let rowSeq = 0;
const nextKey = () => `row-${++rowSeq}`;

const emptyFollowup = (): FollowupDraft => ({
  key: nextKey(),
  owner_name: "",
  task_title: "",
  task_description: "",
  illustrative_value: "",
});

const emptyRecipient = (): RecipientDraft => ({ key: nextKey(), name: "", email: "" });

function defaultSubject(title: string) {
  return title.trim() ? `Follow-ups from ${title.trim()}` : "Follow-ups from our call";
}

function defaultBody(presenter: string) {
  return [
    "Hi {first_name},",
    "",
    "Thanks for your time today. Here are the follow-ups we captured from the call, on a page of your own:",
    "",
    "{recap_url}",
    "",
    "It takes a moment to read, and there's a button on it to tell me if something we noted isn't actually yours.",
    "",
    "Best,",
    presenter.trim() || "",
  ].join("\n");
}

export function RecapComposer() {
  const [step, setStep] = useState<Step>("setup");

  // Setup
  const [title, setTitle] = useState("");
  const [organization, setOrganization] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [presenterName, setPresenterName] = useState("");

  // Transcript + extraction
  const [transcript, setTranscript] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const extractAbort = useRef<AbortController | null>(null);

  // Dropped-file reading. Separate from extraction above on purpose — these
  // are two different waits and the UI keeps them visually distinct.
  const [dragging, setDragging] = useState(false);
  const [readingFile, setReadingFile] = useState<string | null>(null);
  const [loadedFile, setLoadedFile] = useState<{ name: string; meta: string } | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  // Bumped per selection so a slow parse that has been superseded by a newer
  // drop can't overwrite the transcript when it eventually finishes.
  const selectionVersion = useRef(0);

  // Review
  const [followups, setFollowups] = useState<FollowupDraft[]>([]);

  // Recipients
  const [recipients, setRecipients] = useState<RecipientDraft[]>([emptyRecipient()]);

  // Email
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [subjectTouched, setSubjectTouched] = useState(false);
  const [bodyTouched, setBodyTouched] = useState(false);

  // Send
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [result, setResult] = useState<PublishRecapResult | null>(null);

  // The default subject/body track the setup fields until the presenter edits
  // them, so arriving at the Email step doesn't mean retyping their own name.
  useEffect(() => {
    if (!subjectTouched) setSubject(defaultSubject(title));
  }, [title, subjectTouched]);

  useEffect(() => {
    if (!bodyTouched) setBody(defaultBody(presenterName));
  }, [presenterName, bodyTouched]);

  useEffect(() => () => extractAbort.current?.abort(), []);

  const runExtraction = useCallback(async () => {
    extractAbort.current?.abort();
    const controller = new AbortController();
    extractAbort.current = controller;
    setExtracting(true);
    setExtractError(null);
    try {
      const extracted = await extractFollowups(transcript, controller.signal);
      if (controller.signal.aborted) return;
      setFollowups(
        extracted.map((f: ExtractedFollowup) => ({
          key: nextKey(),
          owner_name: f.owner_name ?? "",
          task_title: f.task_title ?? "",
          task_description: f.task_description ?? "",
          illustrative_value:
            typeof f.illustrative_value === "number" ? String(f.illustrative_value) : "",
        })),
      );
      setStep("review");
    } catch (err) {
      if (controller.signal.aborted) return;
      const detail = err instanceof RecapApiError && err.detail ? ` — ${err.detail}` : "";
      setExtractError(`${(err as Error).message}${detail}`);
    } finally {
      if (extractAbort.current === controller) extractAbort.current = null;
      setExtracting(false);
    }
  }, [transcript]);

  const handleFiles = useCallback(async (files: FileList | null) => {
    const picked = files?.[0];
    if (!picked) return;
    const version = ++selectionVersion.current;
    setFileError(null);
    setReadingFile(picked.name);
    try {
      const text = await readTranscriptFile(picked);
      if (version !== selectionVersion.current) return;
      setTranscript(text);
      setLoadedFile({ name: picked.name, meta: describeFile(picked) });
    } catch (err) {
      if (version !== selectionVersion.current) return;
      setLoadedFile(null);
      setFileError(
        err instanceof TranscriptFileError
          ? err.message
          : `${picked.name} couldn't be read. Paste the transcript instead.`,
      );
    } finally {
      if (version === selectionVersion.current) setReadingFile(null);
    }
  }, []);

  const patchFollowup = (key: string, patch: Partial<FollowupDraft>) =>
    setFollowups((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const patchRecipient = (key: string, patch: Partial<RecipientDraft>) =>
    setRecipients((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  // What blocks the current step, named rather than left to a greyed-out
  // button. Returns null when the step is complete.
  const blocker = useMemo<string | null>(() => {
    if (step === "setup") {
      const missing = [
        !title.trim() && "a meeting title",
        !organization.trim() && "an organisation",
        !meetingDate && "a meeting date",
        !presenterName.trim() && "a presenter name",
      ].filter(Boolean) as string[];
      return missing.length ? `Still needs ${missing.join(", ")}.` : null;
    }
    if (step === "transcript") {
      return transcript.trim() ? null : "Drop in a transcript file, or paste the text, first.";
    }
    if (step === "review") {
      if (followups.length === 0) return "There are no follow-ups to send.";
      const unnamed = followups.filter((f) => !f.owner_name.trim()).length;
      if (unnamed) return `${unnamed} follow-up${unnamed > 1 ? "s have" : " has"} no owner.`;
      const untitled = followups.filter((f) => !f.task_title.trim()).length;
      if (untitled) return `${untitled} follow-up${untitled > 1 ? "s have" : " has"} no title.`;
      return null;
    }
    if (step === "recipients") {
      if (recipients.length === 0) return "Add at least one recipient.";
      const unnamed = recipients.filter((r) => !r.name.trim()).length;
      if (unnamed) return `${unnamed} recipient${unnamed > 1 ? "s have" : " has"} no name.`;
      const bad = recipients.filter((r) => !EMAIL_RE.test(r.email.trim())).length;
      if (bad)
        return `${bad} recipient${bad > 1 ? "s have" : " has"} a missing or malformed email address.`;
      return null;
    }
    if (!subject.trim()) return "The subject line is empty.";
    if (!body.trim()) return "The email body is empty.";
    if (!body.includes("{recap_url}"))
      return "The body has no {recap_url} placeholder, so nobody would receive their link.";
    return null;
  }, [
    step,
    title,
    organization,
    meetingDate,
    presenterName,
    transcript,
    followups,
    recipients,
    subject,
    body,
  ]);

  const doSend = async () => {
    setConfirmOpen(false);
    setSending(true);
    setSendError(null);
    try {
      const published = await publishRecap({
        title: title.trim(),
        organization: organization.trim(),
        meeting_date: meetingDate,
        presenter_name: presenterName.trim(),
        followups: followups.map((f) => {
          const value = Number(f.illustrative_value);
          const row: ExtractedFollowup = {
            owner_name: f.owner_name.trim(),
            task_title: f.task_title.trim(),
          };
          if (f.task_description.trim()) row.task_description = f.task_description.trim();
          // Only send a value the presenter actually typed — the column is
          // nullable and an invented figure is worse than no figure.
          if (f.illustrative_value.trim() && Number.isFinite(value)) {
            row.illustrative_value = value;
          }
          return row;
        }),
        recipients: recipients.map((r) => ({ name: r.name.trim(), email: r.email.trim() })),
        email_subject: subject.trim(),
        email_body_template: body,
      });
      setResult(published);
    } catch (err) {
      const detail = err instanceof RecapApiError && err.detail ? ` — ${err.detail}` : "";
      setSendError(`${(err as Error).message}${detail}`);
    } finally {
      setSending(false);
    }
  };

  if (result) return <SentReport result={result} />;

  const stepIndex = STEPS.findIndex((s) => s.key === step);
  const isLastStep = step === "email";

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <header className="mb-1">
        <h1 className="text-xl font-semibold" style={{ color: "var(--skin-ink)" }}>
          Recap
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--skin-ink-soft)" }}>
          Turn a real call transcript into a personal follow-up page for everyone who was on it.
          Nothing is saved and no email goes out until the last step.
        </p>
      </header>

      <StepRail current={stepIndex} />

      <div
        className="rounded-xl p-5"
        style={{
          background: "var(--skin-surface)",
          border: "1px solid var(--skin-line)",
          borderRadius: "var(--skin-radius-lg)",
        }}
      >
        {step === "setup" && (
          <Section
            heading="About the meeting"
            hint="This is what every recipient sees at the top of their page."
          >
            <Field label="Meeting title">
              <input
                className="x-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Intro call — pilot scope"
              />
            </Field>
            <Field label="Organisation">
              <input
                className="x-input"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                placeholder="Their company"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Meeting date">
                <input
                  type="date"
                  className="x-input"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                />
              </Field>
              <Field label="Presenter">
                <input
                  className="x-input"
                  value={presenterName}
                  onChange={(e) => setPresenterName(e.target.value)}
                  placeholder="Who ran the call"
                />
              </Field>
            </div>
          </Section>
        )}

        {step === "transcript" && (
          <Section
            heading="Transcript"
            hint="Drop in a PDF, DOCX, TXT, VTT or SRT file, or paste the text. Either way it is sent for extraction and never stored — not in the database, not here."
          >
            <TranscriptDropzone
              dragging={dragging}
              readingFile={readingFile}
              loadedFile={loadedFile}
              error={fileError}
              onFiles={(files) => void handleFiles(files)}
              onDraggingChange={setDragging}
            />

            <textarea
              value={transcript}
              onChange={(e) => {
                setTranscript(e.target.value);
                // Once it has been edited by hand the text is no longer that
                // file's, so stop claiming it is.
                setLoadedFile(null);
              }}
              rows={16}
              spellCheck={false}
              placeholder="Paste the transcript…"
              className="w-full resize-y rounded-xl p-3 text-sm leading-relaxed outline-none"
              style={{
                background: "var(--skin-bg)",
                border: "1px solid var(--skin-line)",
                color: "var(--skin-ink)",
                fontFamily: "var(--skin-font-body)",
              }}
            />
            <p className="text-xs" style={{ color: "var(--skin-ink-faint)" }}>
              {transcript.trim() ? `${transcript.trim().length.toLocaleString()} characters` : " "}
            </p>

            {extractError && <ErrorNote>{extractError}</ErrorNote>}

            {extracting && (
              <div
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm"
                style={{ background: "var(--skin-accent-soft)", color: "var(--skin-ink)" }}
              >
                <Loader2 className="h-4 w-4 animate-spin" />
                {/* Deliberately not "Reading…": the dropzone above says
                    "Reading <file>" while it parses, and these two can appear
                    seconds apart. They should not read as the same step. */}
                Pulling follow-ups out of the transcript. This is a real model call, so it takes a
                few seconds.
              </div>
            )}
          </Section>
        )}

        {step === "review" && (
          <Section
            heading="Review before anything is sent"
            hint="Edit or delete anything the extraction got wrong. What you leave here is exactly what gets saved and emailed."
          >
            <div className="flex flex-col gap-3">
              {followups.map((f, i) => (
                <FollowupRow
                  key={f.key}
                  index={i}
                  row={f}
                  onChange={(patch) => patchFollowup(f.key, patch)}
                  onRemove={() => setFollowups((rows) => rows.filter((r) => r.key !== f.key))}
                />
              ))}
            </div>
            {followups.length === 0 && (
              <p className="text-sm" style={{ color: "var(--skin-ink-soft)" }}>
                The extraction returned nothing. Add a follow-up by hand, or go back and check the
                transcript.
              </p>
            )}
            <AddRowButton onClick={() => setFollowups((rows) => [...rows, emptyFollowup()])}>
              Add a follow-up
            </AddRowButton>
          </Section>
        )}

        {step === "recipients" && (
          <Section
            heading="Who gets a recap"
            hint="Each person gets their own link. Anyone you add by hand will see the same page, so only add people the framing holds for."
          >
            <div className="flex flex-col gap-2.5">
              {recipients.map((r) => (
                <RecipientRow
                  key={r.key}
                  row={r}
                  canRemove={recipients.length > 1}
                  onChange={(patch) => patchRecipient(r.key, patch)}
                  onRemove={() => setRecipients((rows) => rows.filter((x) => x.key !== r.key))}
                />
              ))}
            </div>
            <AddRowButton onClick={() => setRecipients((rows) => [...rows, emptyRecipient()])}>
              Add a recipient
            </AddRowButton>
          </Section>
        )}

        {step === "email" && (
          <Section
            heading="The email"
            hint="{first_name} and {recap_url} are filled in per recipient. The subject line is sent as written — placeholders are not substituted there."
          >
            <Field label="Subject">
              <input
                className="x-input"
                value={subject}
                onChange={(e) => {
                  setSubjectTouched(true);
                  setSubject(e.target.value);
                }}
              />
            </Field>
            <Field label="Body">
              <textarea
                value={body}
                onChange={(e) => {
                  setBodyTouched(true);
                  setBody(e.target.value);
                }}
                rows={14}
                className="w-full resize-y rounded-xl p-3 text-sm leading-relaxed outline-none"
                style={{
                  background: "var(--skin-bg)",
                  border: "1px solid var(--skin-line)",
                  color: "var(--skin-ink)",
                  fontFamily: "var(--skin-font-body)",
                }}
              />
            </Field>

            <div
              className="rounded-lg px-3 py-2.5 text-sm"
              style={{ background: "var(--skin-warn-soft)", color: "var(--skin-ink)" }}
            >
              <strong className="font-medium">Sending is final.</strong> It writes the recap to the
              database and emails {recipients.length}{" "}
              {recipients.length === 1 ? "person" : "people"} straight away. There is no unsend and
              no edit afterwards.
            </div>

            {sendError && <ErrorNote>{sendError}</ErrorNote>}
          </Section>
        )}

        {blocker && (
          <p className="mt-4 text-sm" style={{ color: "var(--skin-warn)" }}>
            {blocker}
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {stepIndex > 0 && (
            <button
              type="button"
              className="x-btn-secondary"
              disabled={extracting || sending}
              onClick={() => setStep(STEPS[stepIndex - 1].key)}
            >
              Back
            </button>
          )}

          {step === "transcript" ? (
            <button
              type="button"
              className="x-btn-primary inline-flex items-center gap-2"
              disabled={Boolean(blocker) || extracting}
              onClick={() => void runExtraction()}
            >
              {extracting && <Loader2 className="h-4 w-4 animate-spin" />}
              {extracting ? "Extracting…" : "Extract follow-ups"}
            </button>
          ) : isLastStep ? (
            <button
              type="button"
              className="x-btn-primary inline-flex items-center gap-2"
              disabled={Boolean(blocker) || sending}
              onClick={() => setConfirmOpen(true)}
            >
              {sending && <Loader2 className="h-4 w-4 animate-spin" />}
              {sending ? "Sending…" : "Send recap"}
            </button>
          ) : (
            <button
              type="button"
              className="x-btn-primary"
              disabled={Boolean(blocker)}
              onClick={() => setStep(STEPS[stepIndex + 1].key)}
            >
              Continue
            </button>
          )}
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send this recap?</AlertDialogTitle>
            <AlertDialogDescription>
              This saves {followups.length} {followups.length === 1 ? "follow-up" : "follow-ups"}{" "}
              and emails {recipients.length} {recipients.length === 1 ? "person" : "people"} right
              now, each with their own link. It cannot be undone, edited or unsent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void doSend()}>Send for real</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Pieces ────────────────────────────────────────────────────────────────────

function StepRail({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2 py-5">
      {STEPS.map((s, idx) => {
        const done = idx < current;
        const active = idx === current;
        return (
          <div key={s.key} className="flex items-center gap-2">
            <span
              className="text-[11px] uppercase tracking-wide"
              style={{
                color: active ? "var(--skin-accent)" : "var(--skin-ink-faint)",
                fontWeight: active ? 600 : 400,
                opacity: done ? 0.75 : 1,
              }}
            >
              {s.label}
            </span>
            {idx < STEPS.length - 1 && (
              <span
                className="h-px w-4 sm:w-8"
                style={{ background: done ? "var(--skin-accent)" : "var(--skin-line)" }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Section({
  heading,
  hint,
  children,
}: {
  heading: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-[15px] font-semibold" style={{ color: "var(--skin-ink)" }}>
          {heading}
        </h2>
        <p className="mt-0.5 text-[13px]" style={{ color: "var(--skin-ink-soft)" }}>
          {hint}
        </p>
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium" style={{ color: "var(--skin-ink-soft)" }}>
        {label}
      </span>
      {children}
    </label>
  );
}

function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm"
      style={{ background: "var(--skin-bad-soft)", color: "var(--skin-ink)" }}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--skin-bad)" }} />
      <span>{children}</span>
    </div>
  );
}

function AddRowButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex w-fit items-center gap-1.5 text-sm"
      style={{ color: "var(--skin-accent)" }}
    >
      <Plus className="h-4 w-4" />
      {children}
    </button>
  );
}

function RemoveRowButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="rounded-md p-1.5 transition-opacity hover:opacity-70"
      style={{ color: "var(--skin-ink-faint)" }}
    >
      <X className="h-4 w-4" />
    </button>
  );
}

function TranscriptDropzone({
  dragging,
  readingFile,
  loadedFile,
  error,
  onFiles,
  onDraggingChange,
}: {
  dragging: boolean;
  readingFile: string | null;
  loadedFile: { name: string; meta: string } | null;
  error: string | null;
  onFiles: (files: FileList | null) => void;
  onDraggingChange: (dragging: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          onDraggingChange(true);
        }}
        onDragLeave={() => onDraggingChange(false)}
        onDrop={(e) => {
          e.preventDefault();
          onDraggingChange(false);
          onFiles(e.dataTransfer.files);
        }}
        className="flex flex-col items-center justify-center gap-1.5 rounded-xl px-4 py-6 text-center transition-colors"
        style={{
          border: `1px dashed ${dragging ? "var(--skin-accent)" : "var(--skin-line)"}`,
          background: dragging ? "var(--skin-accent-soft)" : "var(--skin-bg)",
        }}
      >
        {readingFile ? (
          // The neutral counterpart to the accent banner the model call uses
          // further down: same spinner, deliberately different surface and
          // wording, because both can be on screen within seconds.
          <div
            className="flex items-center gap-2 text-sm"
            style={{ color: "var(--skin-ink-soft)" }}
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            Reading {readingFile}…
          </div>
        ) : loadedFile ? (
          <div className="flex items-center gap-2 text-sm" style={{ color: "var(--skin-ink)" }}>
            <FileText className="h-4 w-4" style={{ color: "var(--skin-accent)" }} />
            <span className="font-medium">{loadedFile.name}</span>
            <span style={{ color: "var(--skin-ink-faint)" }}>{loadedFile.meta}</span>
          </div>
        ) : (
          <>
            <Upload className="h-5 w-5" style={{ color: "var(--skin-ink-faint)" }} />
            <p className="text-sm" style={{ color: "var(--skin-ink)" }}>
              Drop a transcript here, or{" "}
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="underline"
                style={{ color: "var(--skin-accent)" }}
              >
                choose a file
              </button>
            </p>
            <p className="text-xs" style={{ color: "var(--skin-ink-faint)" }}>
              PDF, DOCX, TXT, VTT or SRT · up to 5 MB · read in your browser, never uploaded
            </p>
          </>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={TRANSCRIPT_ACCEPT}
          className="hidden"
          onChange={(e) => {
            onFiles(e.target.files);
            // Reset so picking the same file twice in a row still fires.
            e.target.value = "";
          }}
        />
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}
    </div>
  );
}

function FollowupRow({
  index,
  row,
  onChange,
  onRemove,
}: {
  index: number;
  row: FollowupDraft;
  onChange: (patch: Partial<FollowupDraft>) => void;
  onRemove: () => void;
}) {
  return (
    <div
      className="rounded-lg p-3.5"
      style={{ background: "var(--skin-bg)", border: "1px solid var(--skin-line)" }}
    >
      <div className="mb-2.5 flex items-center justify-between">
        <span
          className="text-[11px] uppercase tracking-wide"
          style={{ color: "var(--skin-ink-faint)" }}
        >
          Follow-up {index + 1}
        </span>
        <RemoveRowButton onClick={onRemove} label={`Remove follow-up ${index + 1}`} />
      </div>

      <div className="grid gap-2.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <input
          className="x-input"
          value={row.owner_name}
          onChange={(e) => onChange({ owner_name: e.target.value })}
          placeholder="Whose is it?"
          aria-label="Owner name"
        />
        <input
          className="x-input"
          value={row.task_title}
          onChange={(e) => onChange({ task_title: e.target.value })}
          placeholder="What did they agree to?"
          aria-label="Task title"
        />
      </div>

      <textarea
        value={row.task_description}
        onChange={(e) => onChange({ task_description: e.target.value })}
        rows={2}
        placeholder="One sentence of context (optional)"
        aria-label="Task description"
        className="mt-2.5 w-full resize-y rounded-md px-3 py-2 text-sm outline-none"
        style={{
          background: "var(--skin-surface)",
          border: "1px solid var(--skin-line)",
          color: "var(--skin-ink)",
        }}
      />

      <div className="mt-2.5 flex items-center gap-2">
        <input
          type="number"
          className="x-input"
          style={{ maxWidth: 180 }}
          value={row.illustrative_value}
          onChange={(e) => onChange({ illustrative_value: e.target.value })}
          placeholder="Proposed value"
          aria-label="Proposed value"
        />
        <span className="text-xs" style={{ color: "var(--skin-ink-faint)" }}>
          Only if a number was actually said on the call. Leave it empty otherwise.
        </span>
      </div>
    </div>
  );
}

function RecipientRow({
  row,
  canRemove,
  onChange,
  onRemove,
}: {
  row: RecipientDraft;
  canRemove: boolean;
  onChange: (patch: Partial<RecipientDraft>) => void;
  onRemove: () => void;
}) {
  const emailInvalid = row.email.trim().length > 0 && !EMAIL_RE.test(row.email.trim());
  return (
    <div className="flex items-center gap-2">
      <input
        className="x-input"
        style={{ flex: 1 }}
        value={row.name}
        onChange={(e) => onChange({ name: e.target.value })}
        placeholder="Name"
        aria-label="Recipient name"
      />
      <input
        type="email"
        className="x-input"
        style={{ flex: 1.4, borderColor: emailInvalid ? "var(--skin-warn)" : undefined }}
        value={row.email}
        onChange={(e) => onChange({ email: e.target.value })}
        placeholder="name@company.com"
        aria-label="Recipient email"
      />
      {canRemove ? (
        <RemoveRowButton onClick={onRemove} label={`Remove ${row.name || "recipient"}`} />
      ) : (
        <span className="w-7" aria-hidden />
      )}
    </div>
  );
}

function SentReport({ result }: { result: PublishRecapResult }) {
  const sentByEmail = new Map(result.email_results.map((r) => [r.email, r.sent]));
  const failed = result.email_results.filter((r) => !r.sent);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <header className="mb-5">
        <h1 className="text-xl font-semibold" style={{ color: "var(--skin-ink)" }}>
          Recap sent
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--skin-ink-soft)" }}>
          The session is saved and every link below is live. Session id{" "}
          <code className="text-[12px]">{result.session_id}</code>.
        </p>
      </header>

      {failed.length > 0 && (
        <div className="mb-4">
          <ErrorNote>
            {failed.length} {failed.length === 1 ? "email" : "emails"} did not send (
            {failed.map((f) => f.email).join(", ")}). Their pages exist and their links work — you
            can send those by hand. A whole batch failing usually means the SendGrid sender address
            isn&apos;t verified.
          </ErrorNote>
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        {result.recipients.map((r) => (
          <RecipientResultRow key={r.url} recipient={r} sent={sentByEmail.get(r.email) ?? false} />
        ))}
      </div>
    </div>
  );
}

function RecipientResultRow({
  recipient,
  sent,
}: {
  recipient: { name: string; email: string; url: string };
  sent: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(recipient.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard access can be denied; the link is on screen either way.
    }
  };

  return (
    <div
      className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg p-3.5"
      style={{ background: "var(--skin-surface)", border: "1px solid var(--skin-line)" }}
    >
      <span className="font-medium" style={{ color: "var(--skin-ink)" }}>
        {recipient.name}
      </span>
      <span className="text-sm" style={{ color: "var(--skin-ink-soft)" }}>
        {recipient.email}
      </span>
      <span
        className="rounded-full px-2 py-0.5 text-[11px]"
        style={{
          background: sent ? "var(--skin-good-soft)" : "var(--skin-bad-soft)",
          color: sent ? "var(--skin-good)" : "var(--skin-bad)",
        }}
      >
        {sent ? "Email sent" : "Email failed"}
      </span>
      <div className="flex w-full items-center gap-2">
        <a
          href={recipient.url}
          target="_blank"
          rel="noreferrer"
          className="min-w-0 flex-1 truncate text-[13px] underline"
          style={{ color: "var(--skin-accent)" }}
        >
          {recipient.url}
        </a>
        <button
          type="button"
          onClick={() => void copy()}
          className="inline-flex items-center gap-1 text-[13px]"
          style={{ color: "var(--skin-ink-soft)" }}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
