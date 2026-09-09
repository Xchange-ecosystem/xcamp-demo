import { useState } from "react";
import { ChevronDown, Download, FileText, Paperclip, Tag as TagIcon, X } from "lucide-react";
import { RichTextEditor, MAX_ATTACHMENT_BYTES } from "@/components/editor/RichTextEditor";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { getPersonById } from "@/fixtures/people";
import { getProjectById } from "@/fixtures/projects";
import { OBJECTIVES } from "@/fixtures/objectives";
import { useDemoItemsStore } from "@/store/demoItemsStore";
import type { NoteAttachment } from "@/types/xcamp";

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

// Demo counterpart to task-detail/AboutTab — same layout (title/body left,
// Labels/Set up/Attachments accordion right), sourced from useDemoItemsStore
// instead of `notes`; every edit a local store update. No
// updateTaskCore/updateTaskTimeframe/autoTagNote calls.
export function DemoAboutTab({ taskId }: { taskId: string }) {
  const task = useDemoItemsStore((s) => s.tasks[taskId]);
  const updateTask = useDemoItemsStore((s) => s.updateTask);
  const [tagInput, setTagInput] = useState("");

  if (!task || task.deleted) {
    return (
      <p style={{ fontSize: 13, color: "var(--skin-ink-faint)", margin: 0 }}>
        This task was removed.
      </p>
    );
  }

  const project = getProjectById(task.projectId);
  const objective = OBJECTIVES.find((o) => o.id === task.objectiveId);
  const assignee = task.assigneeId ? getPersonById(task.assigneeId) : undefined;
  const owner = assignee ?? (project ? getPersonById(project.ownerId) : undefined);

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !task.tags.includes(t)) updateTask(taskId, { tags: [...task.tags, t] });
    setTagInput("");
  };

  const saveAttachments = (next: NoteAttachment[]) => updateTask(taskId, { attachments: next });

  const pickAttachment = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.onchange = async () => {
      const files = Array.from(input.files ?? []);
      const next = [...task.attachments];
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
      saveAttachments(next);
    };
    input.click();
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
          value={task.title}
          onChange={(e) => updateTask(taskId, { title: e.target.value })}
        />

        <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--skin-ink-soft)", margin: 0 }}>
          About this task and its deliverables
        </h2>

        <RichTextEditor
          content={task.bodyHtml}
          onChange={(html) => updateTask(taskId, { bodyHtml: html })}
          onAddAttachment={(att) => saveAttachments([...task.attachments, att])}
        />
      </div>

      {/* ── Right column ── */}
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
                {!project || !objective ? (
                  <p style={{ fontSize: 13, color: "var(--skin-ink-faint)", margin: 0 }}>
                    Not linked to a project or objective yet.
                  </p>
                ) : (
                  <div
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
                      {project.name}
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
                      {objective.title}
                    </span>
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
                  <label
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: "var(--skin-ink-faint)",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <TagIcon size={12} /> Tags
                  </label>
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
                    {task.tags.map((t) => (
                      <span key={t} className="x-tag">
                        {t}
                        <button
                          onClick={() =>
                            updateTask(taskId, { tags: task.tags.filter((x) => x !== t) })
                          }
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

          <AccordionItem value="setup" style={{ borderColor: "var(--skin-line)" }}>
            <AccordionTrigger style={{ color: "var(--skin-ink)" }}>Set up</AccordionTrigger>
            <AccordionContent>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: "var(--skin-ink-faint)" }}>
                    Timeframe
                  </label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <input
                      type="date"
                      className="x-input"
                      value={task.startDate ?? ""}
                      onChange={(e) => updateTask(taskId, { startDate: e.target.value || null })}
                    />
                    <span style={{ color: "var(--skin-ink-faint)", fontSize: 12 }}>to</span>
                    <input
                      type="date"
                      className="x-input"
                      value={task.endDate ?? ""}
                      onChange={(e) => updateTask(taskId, { endDate: e.target.value || null })}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: "var(--skin-ink-faint)" }}>
                    Created by
                  </label>
                  <span style={{ fontSize: 13, color: "var(--skin-ink)" }}>
                    {owner?.displayName ?? "Unknown"}
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: "var(--skin-ink-faint)" }}>
                    Owned by
                  </label>
                  <span style={{ fontSize: 13, color: "var(--skin-ink-faint)" }}>
                    {owner?.displayName ?? "Unknown"}
                  </span>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="attachments" style={{ borderColor: "var(--skin-line)" }}>
            <AccordionTrigger style={{ color: "var(--skin-ink)" }}>
              Attachments{task.attachments.length > 0 ? ` (${task.attachments.length})` : ""}
            </AccordionTrigger>
            <AccordionContent>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {task.attachments.map((a) => (
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
                      onClick={() => saveAttachments(task.attachments.filter((x) => x.id !== a.id))}
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
