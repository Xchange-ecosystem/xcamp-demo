// P1.4 — composer input modes. The pill row above the Founder composer.
// Text is untouched (still owned by demo.founder.index.tsx); Transcript is
// the one mode that's wired end to end. Voice, Upload and Link agent render
// designed empty states and are visibly inert, not broken.
import { useEffect, useRef, useState } from "react";
import { FileText, Link2, Mic, Send, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TRANSCRIPTS } from "@/fixtures/transcripts";
import { MODE_PILLS } from "./composerModes.constants";

export type InputMode = "text" | "voice" | "upload" | "transcript" | "agent";

export function ModePillRow({
  mode,
  onModeChange,
}: {
  mode: InputMode;
  onModeChange: (m: InputMode) => void;
}) {
  return (
    <div className="mb-2.5 flex flex-wrap gap-1.5" role="group" aria-label="Composer input mode">
      {MODE_PILLS.map((m) => {
        const Icon = m.icon;
        const active = mode === m.id;
        return (
          <button
            key={m.id}
            type="button"
            aria-pressed={active}
            onClick={() => onModeChange(m.id)}
            className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] transition-colors"
            style={{
              borderColor: active ? "var(--skin-accent)" : "var(--skin-line)",
              background: active
                ? "var(--skin-accent-wash, color-mix(in oklch, var(--skin-accent) 12%, transparent))"
                : "transparent",
              color: active
                ? "var(--skin-ink, var(--foreground))"
                : "var(--skin-ink-soft, var(--muted-foreground))",
              fontWeight: active ? 600 : 400,
            }}
          >
            <Icon size={14} style={{ color: active ? "var(--skin-accent)" : undefined }} />
            {m.label}
          </button>
        );
      })}
    </div>
  );
}

const INERT_COPY: Partial<Record<InputMode, { icon: typeof Mic; title: string; body: string }>> = {
  voice: {
    icon: Mic,
    title: "Record or dictate an update",
    body: "Speak instead of typing. Chi transcribes it and proposes the work the same way.",
  },
  upload: {
    icon: Upload,
    title: "Upload a document",
    body: "Drop a spec, a deck or a report and Chi reads it into the project record as proof or context.",
  },
  agent: {
    icon: Link2,
    title: "Connect a tool",
    body: "Let an agent pull delivered items in from where your team already works, and file them here as proof.",
  },
};

const AGENT_CONNECTORS = ["ClickUp", "Google Meet", "Slack", "Notion"];

export function InertModeBody({ mode }: { mode: "voice" | "upload" | "agent" }) {
  const copy = INERT_COPY[mode]!;
  const Icon = copy.icon;
  return (
    <div
      className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-6 text-center"
      style={{
        borderColor: "var(--skin-line)",
        color: "var(--skin-ink-soft, var(--muted-foreground))",
      }}
    >
      <Icon size={22} style={{ color: "var(--skin-ink-faint, var(--muted-foreground))" }} />
      <b className="text-[14px] font-semibold text-foreground">{copy.title}</b>
      <p className="max-w-[44ch] text-[12.5px]">{copy.body}</p>
      {mode === "agent" && (
        <div className="mt-1.5 flex flex-wrap justify-center gap-2">
          {AGENT_CONNECTORS.map((c) => (
            <span
              key={c}
              className="rounded-full border px-3 py-1 text-[12px]"
              style={{
                borderColor: "var(--skin-line)",
                color: "var(--skin-ink-faint, var(--muted-foreground))",
              }}
            >
              {c}
            </span>
          ))}
        </div>
      )}
      <span
        className="mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-[11.5px]"
        style={{
          background: "var(--skin-raised, var(--muted))",
          color: "var(--skin-ink-faint, var(--muted-foreground))",
        }}
      >
        Not part of this demo
      </span>
    </div>
  );
}

export interface TranscriptFile {
  name: string;
  meta: string;
  text: string;
  projectId: string | null;
}

const MAX_TRANSCRIPT_BYTES = 5 * 1024 * 1024;
const SUPPORTED_TRANSCRIPT_EXTENSIONS = new Set(["txt", "vtt", "srt"]);

export function TranscriptModeBody({
  file,
  onFileSelected,
  onClear,
  onSend,
}: {
  file: TranscriptFile | null;
  onFileSelected: (file: TranscriptFile) => void;
  onClear: () => void;
  onSend: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const selectionVersion = useRef(0);

  useEffect(
    () => () => {
      selectionVersion.current += 1;
    },
    [],
  );

  const handleFiles = async (files: FileList | null) => {
    const picked = files?.[0];
    if (!picked) return;
    const version = ++selectionVersion.current;
    setFileError(null);

    const extension = picked.name.split(".").pop()?.toLowerCase() ?? "";
    if (!SUPPORTED_TRANSCRIPT_EXTENSIONS.has(extension)) {
      setFileError("Choose a plain-text transcript in TXT, VTT, or SRT format.");
      return;
    }
    if (picked.size === 0) {
      setFileError("That transcript is empty.");
      return;
    }
    if (picked.size > MAX_TRANSCRIPT_BYTES) {
      setFileError("That transcript is larger than 5 MB. Split it before uploading.");
      return;
    }

    try {
      const text = await picked.text();
      if (version !== selectionVersion.current) return;
      if (!text.trim()) {
        setFileError("That transcript contains no readable text.");
        return;
      }
      setFileError(null);
      onFileSelected({
        name: picked.name,
        meta: `${Math.max(1, Math.ceil(picked.size / 1024))} KB · ${text.split("\n").length} lines · uploaded just now`,
        text,
        projectId: null,
      });
    } catch {
      if (version !== selectionVersion.current) return;
      setFileError("The transcript could not be read. Try another file.");
    }
  };

  const selectSample = (transcriptId: string) => {
    const transcript = TRANSCRIPTS.find((candidate) => candidate.id === transcriptId);
    if (!transcript) return;
    selectionVersion.current += 1;
    setFileError(null);
    onFileSelected({
      name: `${transcript.title}.txt`,
      meta: `Sample · ${transcript.date} · ${transcript.participants.length} participants`,
      text: transcript.rawText,
      projectId: transcript.projectId,
    });
  };

  if (file) {
    return (
      <div className="flex flex-col gap-2">
        <div
          className="flex items-center gap-3 rounded-md p-3"
          style={{ background: "var(--skin-raised, var(--muted))" }}
        >
          <FileText size={17} style={{ color: "var(--skin-accent)" }} />
          <span className="min-w-0 flex-1">
            <b className="block truncate text-[13.5px] font-semibold">{file.name}</b>
            <small
              className="text-[12px]"
              style={{ color: "var(--skin-ink-faint, var(--muted-foreground))" }}
            >
              {file.meta}
            </small>
          </span>
          <button
            type="button"
            onClick={() => {
              selectionVersion.current += 1;
              onClear();
            }}
            aria-label="Remove file"
            className="text-lg leading-none"
            style={{ color: "var(--skin-ink-faint, var(--muted-foreground))" }}
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex justify-end">
          <Button size="sm" onClick={onSend}>
            Send to Chi <Send size={14} />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.vtt,.srt,text/plain"
        className="hidden"
        onChange={(e) => {
          void handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void handleFiles(e.dataTransfer.files);
        }}
        className="flex w-full flex-col items-center gap-2 rounded-lg border-[1.5px] border-dashed p-7 text-center transition-colors"
        style={{
          borderColor: "var(--skin-line)",
          color: "var(--skin-ink-soft, var(--muted-foreground))",
        }}
      >
        <Upload size={24} style={{ color: "var(--skin-ink-faint, var(--muted-foreground))" }} />
        <b className="text-[14.5px] font-semibold text-foreground">Drop a meeting transcript</b>
        <small className="text-[12.5px]">Or click to choose a file. Plain text, VTT or SRT.</small>
      </button>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <label
          htmlFor="sample-transcript"
          className="text-[12.5px]"
          style={{ color: "var(--skin-ink-soft, var(--muted-foreground))" }}
        >
          Or use a demo transcript
        </label>
        <select
          id="sample-transcript"
          defaultValue=""
          onChange={(event) => {
            selectSample(event.target.value);
            event.target.value = "";
          }}
          className="max-w-full rounded-md border bg-background px-2.5 py-1.5 text-[12.5px] text-foreground"
          style={{ borderColor: "var(--skin-line)" }}
        >
          <option value="" disabled>
            Choose a sample…
          </option>
          {TRANSCRIPTS.map((transcript) => (
            <option key={transcript.id} value={transcript.id}>
              {transcript.title}
            </option>
          ))}
        </select>
      </div>
      {fileError && (
        <p className="mt-2 text-center text-xs" role="alert" style={{ color: "var(--skin-bad)" }}>
          {fileError}
        </p>
      )}
    </>
  );
}
