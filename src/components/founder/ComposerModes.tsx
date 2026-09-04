// P1.4 — composer input modes. The pill row above the Founder composer.
// Text is untouched (still owned by demo.founder.index.tsx); Transcript is
// the one mode that's wired end to end. Voice, Upload and Link agent render
// designed empty states and are visibly inert, not broken.
import { useRef } from "react";
import { FileText, Link2, Mic, Send, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <div className="mb-2.5 flex flex-wrap gap-1.5" role="tablist" aria-label="Composer input mode">
      {MODE_PILLS.map((m) => {
        const Icon = m.icon;
        const active = mode === m.id;
        return (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={active}
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
}

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

  const handleFiles = (files: FileList | null) => {
    const picked = files?.[0];
    if (!picked) return;
    picked.text().then((text) => {
      onFileSelected({
        name: picked.name,
        meta: `${(picked.size / 1024).toFixed(0)} KB · ${text.split("\n").length} lines · uploaded just now`,
        text,
      });
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
            onClick={onClear}
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
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFiles(e.dataTransfer.files);
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
    </>
  );
}
