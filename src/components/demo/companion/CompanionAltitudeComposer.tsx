// src/components/demo/companion/CompanionAltitudeComposer.tsx
//
// Phase 0 found no reusable attach/mic/send composer component anywhere in
// the repo (Founder Home's composer has no mic; the existing
// /demo/founder/companion route's composer has neither attach nor mic; the
// real VoiceTranscriber is a modal transcription flow, not an inline bar).
// Built new to match the mockups: a tall rounded input with a vertical icon
// stack (add / attach / mic / send) on the trailing edge. Attach and mic are
// visibly present but inert ("Not part of this demo", same convention as
// ComposerModes.tsx's InertModeBody) — only Send does anything, and what it
// does is a canned acknowledgement, not a real model call.
import { useRef, useState } from "react";
import { Mic, Paperclip, Plus, Send } from "lucide-react";
import { toast } from "sonner";

interface CompanionAltitudeComposerProps {
  onSend: (text: string) => void;
}

function InertIconButton({ icon: Icon, label }: { icon: typeof Mic; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => toast(`${label} isn't part of this demo yet.`)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 30,
        height: 30,
        border: "none",
        borderRadius: 999,
        background: "transparent",
        color: "var(--skin-ink-faint)",
        cursor: "pointer",
      }}
    >
      <Icon size={16} />
    </button>
  );
}

export function CompanionAltitudeComposer({ onSend }: CompanionAltitudeComposerProps) {
  const [draft, setDraft] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    onSend(text);
    textareaRef.current?.focus();
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: 6,
        width: "100%",
        borderRadius: 22,
        border: "1px solid var(--glass-border-color)",
        background: "var(--glass-bubble-bg)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        padding: "10px 8px 10px 16px",
      }}
    >
      <textarea
        ref={textareaRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
        placeholder="Message Chi…"
        rows={1}
        style={{
          flex: 1,
          resize: "none",
          border: "none",
          outline: "none",
          background: "transparent",
          fontSize: 14,
          lineHeight: 1.5,
          color: "var(--glass-text)",
          maxHeight: 120,
          padding: "5px 0",
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
        <InertIconButton icon={Plus} label="Add" />
        <InertIconButton icon={Paperclip} label="Attach a file" />
        <InertIconButton icon={Mic} label="Voice input" />
        <button
          type="button"
          aria-label="Send"
          disabled={!draft.trim()}
          onClick={handleSend}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 30,
            height: 30,
            border: "none",
            borderRadius: 999,
            background: draft.trim() ? "var(--skin-accent)" : "var(--glass-bubble-bg)",
            color: draft.trim() ? "#fff" : "var(--skin-ink-faint)",
            cursor: draft.trim() ? "pointer" : "default",
            transition: "background 0.15s, color 0.15s",
          }}
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}
