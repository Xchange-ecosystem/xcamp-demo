import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Sparkles,
  Paperclip,
  X,
  FileText,
  Download,
  Tag as TagIcon,
} from "lucide-react";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { useDebounce } from "@/hooks/useDebounce";
import { updateTaskCore, updateTaskTimeframe, type TaskLabelObjective } from "@/lib/xcamp-api";
import { MAX_ATTACHMENT_BYTES } from "@/components/editor/RichTextEditor";
import type { NoteAttachment, NoteRow, XcampUser } from "@/types/xcamp";
import { isDemoTaskId } from "@/lib/demo-items";
import { DemoAboutTab } from "@/components/task-detail/DemoAboutTab";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type AboutTabProps = {
  noteRow: NoteRow;
  labels: TaskLabelObjective[];
  ownerName: string | null;
  user: XcampUser;
  onSaved: () => void;
  /** Centralized in the shell so concurrent detail writes from other tabs (e.g.
   * Do & Document's blob) never get clobbered by a stale `detail` snapshot. */
  patchDetail: (patch: Record<string, unknown>) => Promise<void>;
};

export function AboutTab(props: AboutTabProps) {
  // Demo tasks (fixture ids) read/write the local demo store, never
  // updateTaskCore/updateTaskTimeframe/autoTagNote — see
  // src/lib/demo-items.ts. Real (non-demo) task ids fall through to the
  // unchanged implementation below. Kept as an outer wrapper (rather than an
  // early return inside RealAboutTab) so neither branch calls hooks
  // conditionally.
  if (isDemoTaskId(props.noteRow.id)) {
    return <DemoAboutTab taskId={props.noteRow.id} />;
  }
  return <RealAboutTab {...props} />;
}

function RealAboutTab({ noteRow, labels, ownerName, user, onSaved, patchDetail }: AboutTabProps) {
  const [title, setTitle] = useState(noteRow.title);
  const [body, setBody] = useState(noteRow.body_html ?? "");
  const [tags, setTags] = useState<string[]>(noteRow.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [attachments, setAttachments] = useState<NoteAttachment[]>(
    (noteRow.detail?.attachments as NoteAttachment[] | undefined) ?? [],
  );
  const [startDate, setStartDate] = useState(noteRow.start_date ?? "");
  const [endDate, setEndDate] = useState(noteRow.end_date ?? "");
  const [autoTagging, setAutoTagging] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  // ── Title / body autosave (debounced, mirrors NoteEditor's pattern) ──────
  const debouncedTitle = useDebounce(title, 1500);
  const debouncedBody = useDebounce(body, 1500);
  const initialTitleRef = useRef(title);
  const initialBodyRef = useRef(body);
  const firstRun = useRef(true);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    if (debouncedTitle === initialTitleRef.current && debouncedBody === initialBodyRef.current)
      return;
    initialTitleRef.current = debouncedTitle;
    initialBodyRef.current = debouncedBody;
    setSaveStatus("saving");
    updateTaskCore(user, noteRow.id, {
      title: debouncedTitle.trim() || "Untitled task",
      bodyHtml: debouncedBody,
      tags,
    })
      .then(() => {
        setSaveStatus("saved");
        onSaved();
        setTimeout(() => setSaveStatus((s) => (s === "saved" ? "idle" : s)), 2000);
      })
      .catch((e) => {
        console.error("About tab autosave failed", e);
        setSaveStatus("idle");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedTitle, debouncedBody]);

  const saveTags = async (next: string[]) => {
    setTags(next);
    try {
      await updateTaskCore(user, noteRow.id, {
        title: title.trim() || "Untitled task",
        bodyHtml: body,
        tags: next,
      });
      onSaved();
    } catch (e) {
      console.error("Tag save failed", e);
    }
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) void saveTags([...tags, t]);
    setTagInput("");
  };

  const handleAutoTag = async () => {
    setAutoTagging(true);
    try {
      const { autoTagNote } = await import("@/lib/xcamp-api");
      const suggested = await autoTagNote(user, noteRow.id, title, body);
      if (suggested.length) setTags(suggested);
    } catch (e) {
      console.error("Auto-tag failed", e);
    } finally {
      setAutoTagging(false);
    }
  };

  const saveAttachments = async (next: NoteAttachment[]) => {
    setAttachments(next);
    try {
      await patchDetail({ attachments: next });
      onSaved();
    } catch (e) {
      console.error("Attachment save failed", e);
    }
  };

  const pickAttachment = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.onchange = async () => {
      const files = Array.from(input.files ?? []);
      const next = [...attachments];
      for (const file of files) {
        if (file.size > MAX_ATTACHMENT_BYTES) {
          alert(`"${file.name}" is larger than 2 MB and can't be attached inline.`);
          continue;
        }
        const dataUrl = await fileToDataUrl(file);
        next.push({
          id: crypto.randomUUID(),
          name: file.name,
          mime: file.type || "application/octet-stream",
          size: file.size,
          dataUrl,
        });
      }
      void saveAttachments(next);
    };
    input.click();
  };

  const saveTimeframe = async (next: { startDate: string; endDate: string }) => {
    try {
      await updateTaskTimeframe(user, noteRow.id, {
        startDate: next.startDate || null,
        endDate: next.endDate || null,
      });
      onSaved();
    } catch (e) {
      console.error("Timeframe save failed", e);
    }
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 300px",
        gap: 28,
        alignItems: "start",
      }}
    >
      {/* ── Left: title + body ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
        {/* Save status */}
        <div style={{ minHeight: 16, fontSize: 12, color: "var(--skin-ink-faint)" }}>
          {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved" : ""}
        </div>

        {/* Title */}
        <textarea
          className="x-input"
          style={{
            fontWeight: 700,
            fontSize: 24,
            border: "none",
            background: "transparent",
            padding: 0,
            width: "100%",
            resize: "none",
            lineHeight: 1.25,
            fontFamily: "var(--skin-font-head)",
          }}
          rows={1}
          placeholder="Task title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <h2
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "var(--skin-ink-soft)",
            margin: 0,
          }}
        >
          About this task and its deliverables
        </h2>

        {/* Main text area */}
        <RichTextEditor
          content={body}
          onChange={setBody}
          onAddAttachment={(att) => void saveAttachments([...attachments, att])}
        />
      </div>

      {/* ── Right column: Labels and tags / Set up / Attachments ── */}
      <div style={{ minWidth: 0 }}>
        <Accordion
          type="multiple"
          defaultValue={["labels", "setup", "attachments"]}
          className="w-full"
        >
          <AccordionItem value="labels" style={{ borderColor: "var(--skin-line)" }}>
            <AccordionTrigger style={{ color: "var(--skin-ink)" }}>
              Labels and tags
            </AccordionTrigger>
            <AccordionContent>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {labels.length === 0 ? (
                  <p style={{ fontSize: 13, color: "var(--skin-ink-faint)", margin: 0 }}>
                    Not linked to a project or objective yet.
                  </p>
                ) : (
                  labels.map((l) => (
                    <div
                      key={l.id}
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 8,
                        alignItems: "center",
                        fontSize: 12,
                      }}
                    >
                      <span
                        style={{
                          padding: "3px 10px",
                          borderRadius: "var(--skin-radius-pill)",
                          background: "var(--skin-surface2)",
                          border: "1px solid var(--skin-line)",
                          color: "var(--skin-ink-soft)",
                        }}
                      >
                        {l.projectTitle}
                      </span>
                      <ChevronDown
                        size={11}
                        style={{ transform: "rotate(-90deg)", color: "var(--skin-ink-faint)" }}
                      />
                      <span
                        style={{
                          padding: "3px 10px",
                          borderRadius: "var(--skin-radius-pill)",
                          background: "var(--skin-accent-soft)",
                          color: "var(--skin-accent)",
                          fontWeight: 500,
                        }}
                      >
                        {l.title}
                      </span>
                      {l.dimension && (
                        <span style={{ color: "var(--skin-ink-faint)" }}>{l.dimension}</span>
                      )}
                      {l.category && (
                        <span style={{ color: "var(--skin-ink-faint)" }}>· {l.category}</span>
                      )}
                    </div>
                  ))
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <label
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: "var(--skin-ink-faint)",
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <TagIcon size={12} /> Tags
                    </label>
                    <button
                      type="button"
                      onClick={() => void handleAutoTag()}
                      disabled={autoTagging}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 11,
                        color: "var(--skin-accent)",
                        background: "none",
                        border: "none",
                        cursor: autoTagging ? "wait" : "pointer",
                        padding: "2px 6px",
                      }}
                    >
                      <Sparkles size={11} />
                      Auto-tag
                    </button>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
                    {tags.map((t) => (
                      <span key={t} className="x-tag">
                        {t}
                        <button
                          onClick={() => void saveTags(tags.filter((x) => x !== t))}
                          aria-label={`Remove ${t}`}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                    <input
                      className="x-input"
                      style={{ width: 140, height: 28, fontSize: 12 }}
                      placeholder="Add tag…"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* ── Set up accordion — start_date/end_date here are the deadline
              source the objective/project dashboards read (see Set up below). ── */}
          <AccordionItem value="setup" style={{ borderColor: "var(--skin-line)" }}>
            <AccordionTrigger style={{ color: "var(--skin-ink)" }}>Set up</AccordionTrigger>
            <AccordionContent>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Timeframe — functional */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: "var(--skin-ink-faint)" }}>
                    Timeframe
                  </label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <input
                      type="date"
                      className="x-input"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        void saveTimeframe({ startDate: e.target.value, endDate });
                      }}
                    />
                    <span style={{ color: "var(--skin-ink-faint)", fontSize: 12 }}>to</span>
                    <input
                      type="date"
                      className="x-input"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        void saveTimeframe({ startDate, endDate: e.target.value });
                      }}
                    />
                  </div>
                </div>

                {/* Created by — functional, read-only */}
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: "var(--skin-ink-faint)" }}>
                    Created by
                  </label>
                  <span style={{ fontSize: 13, color: "var(--skin-ink)" }}>
                    {ownerName ?? "Unknown"}
                  </span>
                </div>

                {/* Owned by — deferred: display-only, no edit control, no write path.
                    Reads the same owner_central_id as "Created by" today, but that's
                    incidental — task-level ownership/reassignment is pending the same
                    architecture decision as Match & Collaborate (see MatchCollaborateTab). */}
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: "var(--skin-ink-faint)" }}>
                    Owned by
                  </label>
                  <span style={{ fontSize: 13, color: "var(--skin-ink-faint)" }}>
                    {ownerName ?? "Unknown"}
                  </span>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* ── Attachments accordion — shares notes.detail.attachments with Do & Document ── */}
          <AccordionItem value="attachments" style={{ borderColor: "var(--skin-line)" }}>
            <AccordionTrigger style={{ color: "var(--skin-ink)" }}>
              Attachments{attachments.length > 0 ? ` (${attachments.length})` : ""}
            </AccordionTrigger>
            <AccordionContent>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {attachments.map((a) => (
                  <div key={a.id} className="x-file-card">
                    <FileText size={18} style={{ color: "var(--skin-accent)" }} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate" style={{ fontSize: 13, fontWeight: 500 }}>
                        {a.name}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--skin-ink-faint)" }}>
                        {formatBytes(a.size)}
                      </div>
                    </div>
                    <a href={a.dataUrl} download={a.name} className="x-icon-link" title="Download">
                      <Download size={16} />
                    </a>
                    <button
                      className="x-icon-link"
                      onClick={() => void saveAttachments(attachments.filter((x) => x.id !== a.id))}
                      title="Remove"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="x-btn-secondary"
                  onClick={pickAttachment}
                  style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 6 }}
                >
                  <Paperclip size={13} />
                  Add attachment
                </button>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
