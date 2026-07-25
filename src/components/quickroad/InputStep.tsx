import { useEffect, useRef, useState } from "react";
import { Loader2, Paperclip, X } from "lucide-react";
import { createSession, interpretFile, interpret, listModes } from "@/lib/backcaster-api";
import type { useQuickRoad } from "@/hooks/useQuickRoad";

const ACCEPTED_EXTS = ["txt", "md", "pdf", "docx", "pptx", "xlsx", "csv"];
const ACCEPT_ATTR = [
  ".txt",
  ".md",
  ".pdf",
  ".docx",
  ".pptx",
  ".xlsx",
  ".csv",
  "text/plain",
  "text/markdown",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
].join(",");

// ─── Component ────────────────────────────────────────────────────────────────

export function InputStep({ qr }: { qr: ReturnType<typeof useQuickRoad> }) {
  const { state, patch, setStage } = qr;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modesLoading, setModesLoading] = useState(!state.selectedModeId);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Silently fetch modes and auto-pick the required BPMO framework mode.
  useEffect(() => {
    if (state.selectedModeId) {
      setModesLoading(false);
      setStage("modes", "ok");
      return;
    }
    setModesLoading(true);
    setStage("modes", "running", { endpoint: "GET /modes" });
    listModes()
      .then((all) => {
        const active = all.filter((m) => m.status === "active");
        if (!active.length) {
          if (all.length) {
            setError("No active planning modes are available right now.");
            setStage("modes", "failed", { error: "No active planning modes." });
          }
          return;
        }
        // This simplified Backcaster always uses the BMPO mode.
        const isBmpo = (m: { name?: string; slug?: string; category?: string }) =>
          [m.name, m.slug, m.category].some((v) => {
            const value = (v ?? "").toLowerCase();
            return value.includes("bpmo") || value.includes("bmpo");
          });
        const bmpo = active.find(isBmpo);
        if (!bmpo) {
          setError("The BPMO planning mode is not available right now.");
          setStage("modes", "failed", { error: "BPMO mode not found." });
          return;
        }
        setError(null);
        patch({ selectedModeId: bmpo.id });
        setStage("modes", "ok");
      })
      .catch((e) => {
        setError((e as Error).message);
        setStage("modes", "failed", { error: (e as Error).message });
      })
      .finally(() => setModesLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stageFile = (file: File) => {
    const ext = file.name.toLowerCase().split(".").pop() ?? "";
    if (!ACCEPTED_EXTS.includes(ext)) {
      setFileError(
        `Unsupported file type: .${ext || "(none)"}. Supported: .txt, .md, .pdf, .docx, .pptx, .xlsx, .csv`,
      );
      return;
    }
    setFileError(null);
    setStagedFile(file);
  };

  const clearFile = () => {
    setStagedFile(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) stageFile(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) stageFile(file);
    e.target.value = "";
  };

  const canSubmit = stagedFile
    ? !modesLoading
    : Boolean(state.rawInput.trim()) && !modesLoading;

  const submit = async () => {
    if (!state.selectedModeId || modesLoading) {
      setError("Still getting ready — please try again in a moment.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      // Session creation — raw_input is the filename if a file is staged,
      // otherwise the typed text.
      const rawInputForSession = stagedFile ? stagedFile.name : state.rawInput;
      setStage("session", "running", { endpoint: "POST /sessions", error: null });
      const session = await createSession({
        mode_id: state.selectedModeId,
        raw_input: rawInputForSession,
      });
      if (!session?.id) {
        throw new Error("No session id was returned by the server.");
      }
      setStage("session", "ok");

      const interpretEndpoint = stagedFile ? "POST /interpret-file" : "POST /interpret";
      setStage("interpret", "running", { endpoint: interpretEndpoint });

      let result: { interpretation: string; suggestedTitle?: string };
      if (stagedFile) {
        result = await interpretFile({
          file: stagedFile,
          session_id: session.id,
          mode_id: state.selectedModeId,
          context: state.rawInput || undefined,
        });
      } else {
        result = await interpret({
          session_id: session.id,
          raw_input: state.rawInput,
        });
      }

      setStage("interpret", "ok");
      patch({
        sessionId: session.id,
        interpretation: result.interpretation,
        projectTitleOverride: result.suggestedTitle || "",
        step: "interpret",
      });
    } catch (e) {
      const msg = (e as Error).message;
      setError(msg);
      if (state.diag.stages.session === "running") setStage("session", "failed", { error: msg });
      else setStage("interpret", "failed", { error: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-base font-semibold mb-2" style={{ color: "var(--skin-ink)" }}>
          What do you want to achieve?
        </label>
        <textarea
          value={state.rawInput}
          onChange={(e) => patch({ rawInput: e.target.value })}
          rows={8}
          placeholder={
            stagedFile
              ? "Optional: add context or focus instructions for the AI…"
              : "Describe your goal in your own words…"
          }
          className="w-full rounded-xl p-3 text-sm outline-none resize-y"
          style={{ background: "var(--skin-bg)", border: "1px solid var(--skin-line)", color: "var(--skin-ink)" }}
        />
      </div>

      {/* File drop zone / staged file pill */}
      <div>
        {stagedFile ? (
          <div
            className="flex items-center justify-between rounded-xl px-4 py-3 text-sm"
            style={{ border: "2px solid var(--skin-accent)", background: "color-mix(in srgb, var(--skin-accent) 8%, transparent)" }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Paperclip size={16} style={{ color: "var(--skin-accent)", flexShrink: 0 }} />
              <span className="truncate font-medium" style={{ color: "var(--skin-ink)" }}>
                {stagedFile.name}
              </span>
              <span className="text-xs flex-shrink-0" style={{ color: "var(--skin-ink-soft)" }}>
                ({(stagedFile.size / 1024).toFixed(0)} KB)
              </span>
            </div>
            <button
              type="button"
              onClick={clearFile}
              aria-label="Remove file"
              className="ml-2 flex-shrink-0 rounded p-0.5 transition-opacity hover:opacity-70"
              style={{ color: "var(--skin-ink-soft)" }}
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <div
            role="button"
            tabIndex={0}
            aria-label="Drop a file for AI interpretation"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-1.5 rounded-xl p-4 text-sm cursor-pointer transition-colors select-none"
            style={{
              border: `2px dashed ${isDragging ? "var(--skin-accent)" : "var(--skin-line)"}`,
              background: isDragging
                ? "color-mix(in srgb, var(--skin-accent) 8%, transparent)"
                : "var(--skin-surface)",
              color: isDragging ? "var(--skin-accent)" : "var(--skin-ink-soft)",
            }}
          >
            <Paperclip
              size={18}
              style={{ color: isDragging ? "var(--skin-accent)" : "var(--skin-ink-soft)" }}
            />
            <span>
              {isDragging
                ? "Drop to send file to AI"
                : "Drop a file (.txt, .md, .pdf, .docx, .pptx, .xlsx, .csv) or click to browse"}
            </span>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT_ATTR}
          className="hidden"
          onChange={handleFileInput}
        />
        {fileError && (
          <p className="mt-1.5 text-xs" style={{ color: "var(--accent-yellow, #E6A817)" }}>
            {fileError}
          </p>
        )}
      </div>

      {error && (
        <p className="text-sm" style={{ color: "var(--accent-yellow, #E6A817)" }}>
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={submitting || modesLoading || !canSubmit}
        onClick={submit}
        className="w-full rounded-xl py-3 font-semibold inline-flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
        style={{ background: "var(--skin-accent)", color: "#fff" }}
      >
        {(submitting || modesLoading) && <Loader2 className="animate-spin" size={16} />}
        {modesLoading ? "Preparing BPMO mode" : submitting ? "Analysing…" : "Continue"}
      </button>
    </div>
  );
}
