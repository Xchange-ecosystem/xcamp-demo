import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Sparkles,
  Users2,
  Paperclip,
  Plus,
  Link2,
  X,
  FileText,
  Download,
  Loader2,
  Pencil,
} from "lucide-react";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { MAX_ATTACHMENT_BYTES } from "@/components/editor/RichTextEditor";
import { useDebounce } from "@/hooks/useDebounce";
import { searchItems, type LinkedItem } from "@/lib/sidepanel-service";
import {
  createActionSuggestion,
  createProofNote,
  fetchProofNotes,
  linkExistingNoteAsProof,
  patchProofNoteDetail,
  renameProofNote,
  unlinkProofNote,
  updateProofNoteBody,
} from "@/lib/proof-notes-api";
import type { NoteAttachment, NoteRow, XcampUser } from "@/types/xcamp";
import type { TaskTabKey } from "./tabs";

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

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function DoDocumentTab({
  noteRow,
  user,
  onSwitchTab,
}: {
  noteRow: NoteRow;
  user: XcampUser;
  /** "Find a collaborator" opens the same flow as Match & Collaborate — jump there
   * instead of building a second entry point into an unresolved feature. */
  onSwitchTab: (tab: TaskTabKey) => void;
}) {
  const qc = useQueryClient();
  const taskId = noteRow.id;
  const proofKey = ["proof-notes", taskId];

  const { data: proofNotes = [], isLoading } = useQuery({
    queryKey: proofKey,
    queryFn: () => fetchProofNotes(taskId),
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  useEffect(() => {
    if (!selectedId && proofNotes.length) setSelectedId(proofNotes[0].id);
    if (selectedId && !proofNotes.some((n) => n.id === selectedId)) {
      setSelectedId(proofNotes[0]?.id ?? null);
    }
  }, [proofNotes, selectedId]);

  const selected = useMemo(
    () => proofNotes.find((n) => n.id === selectedId) ?? null,
    [proofNotes, selectedId],
  );

  const invalidate = () => qc.invalidateQueries({ queryKey: proofKey });

  const createTab = useMutation({
    mutationFn: () => createProofNote(user, taskId),
    onSuccess: (note) => {
      invalidate();
      setSelectedId(note.id);
    },
  });

  const removeTab = useMutation({
    mutationFn: (proofNoteId: string) => unlinkProofNote(taskId, proofNoteId),
    onSuccess: invalidate,
  });

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const rename = useMutation({
    mutationFn: (input: { id: string; title: string }) =>
      renameProofNote(user, input.id, input.title),
    onSuccess: invalidate,
  });

  // ── "switching type=note to type=proof" — link an existing note as proof ──
  const [showLinkExisting, setShowLinkExisting] = useState(false);
  const [linkQuery, setLinkQuery] = useState("");
  const debouncedLinkQuery = useDebounce(linkQuery, 300);
  const [searchResults, setSearchResults] = useState<LinkedItem[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!showLinkExisting || !debouncedLinkQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    searchItems(
      debouncedLinkQuery,
      ["note"],
      proofNotes.map((n) => n.id),
      user.tenantId,
      { noteType: "note" },
    )
      .then(setSearchResults)
      .finally(() => setSearching(false));
  }, [debouncedLinkQuery, showLinkExisting, proofNotes, user.tenantId]);

  const linkExisting = useMutation({
    mutationFn: (existingNoteId: string) => linkExistingNoteAsProof(user, taskId, existingNoteId),
    onSuccess: (note) => {
      invalidate();
      setSelectedId(note.id);
      setShowLinkExisting(false);
      setLinkQuery("");
    },
  });

  // ── Body autosave ──
  const [body, setBody] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const debouncedBody = useDebounce(body, 1500);
  const bodyBaseline = useRef<string | null>(null);

  useEffect(() => {
    setBody(selected?.body_html ?? "");
    bodyBaseline.current = selected?.body_html ?? "";
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selected) return;
    if (bodyBaseline.current === null || debouncedBody === bodyBaseline.current) return;
    bodyBaseline.current = debouncedBody;
    setSaveStatus("saving");
    updateProofNoteBody(user, selected.id, debouncedBody)
      .then(() => {
        setSaveStatus("saved");
        void invalidate();
        setTimeout(() => setSaveStatus((s) => (s === "saved" ? "idle" : s)), 2000);
      })
      .catch((e) => {
        console.error("Proof note autosave failed", e);
        setSaveStatus("idle");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedBody]);

  // ── Attachments (scoped to the selected proof note, not the task) ──
  const saveAttachments = async (next: NoteAttachment[]) => {
    if (!selected) return;
    try {
      await patchProofNoteDetail(user, selected.id, selected.detail, { attachments: next });
      void invalidate();
    } catch (e) {
      console.error("Proof note attachment save failed", e);
    }
  };

  const pickAttachment = () => {
    if (!selected) return;
    const attachments = (selected.detail.attachments as NoteAttachment[] | undefined) ?? [];
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

  const [dragOver, setDragOver] = useState(false);
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (!selected) return;
    const files = Array.from(e.dataTransfer.files ?? []);
    if (!files.length) return;
    const attachments = (selected.detail.attachments as NoteAttachment[] | undefined) ?? [];
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

  // ── "Create Action or Artefact" — dynamix_action_suggestions ──
  const [showCreateAction, setShowCreateAction] = useState(false);
  const [actionTitle, setActionTitle] = useState("");
  const [actionKind, setActionKind] = useState<"action" | "artefact">("action");
  const createAction = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error("Select a deliverable first.");
      return createActionSuggestion(user, selected.id, {
        title: actionTitle,
        suggestionType: actionKind,
      });
    },
    onSuccess: () => {
      setShowCreateAction(false);
      setActionTitle("");
    },
  });

  const attachments = (selected?.detail.attachments as NoteAttachment[] | undefined) ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Top-right actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--skin-ink)", margin: 0, flex: 1 }}>
          Do &amp; Document
        </h2>
        <button
          type="button"
          disabled
          className="x-btn-secondary"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            opacity: 0.6,
            cursor: "not-allowed",
          }}
          title="No external sync integration is wired up yet"
        >
          <Sparkles size={13} />
          Connect your work
        </button>
        <button
          type="button"
          className="x-btn-secondary"
          onClick={() => onSwitchTab("match-collaborate")}
          style={{ display: "flex", alignItems: "center", gap: 6 }}
        >
          <Users2 size={13} />
          Find a collaborator
        </button>
        <button
          type="button"
          className="x-btn-secondary"
          disabled={!selected}
          onClick={() => setShowCreateAction((v) => !v)}
          style={{ display: "flex", alignItems: "center", gap: 6, opacity: selected ? 1 : 0.5 }}
        >
          <Sparkles size={13} />
          Create Action or Artefact
        </button>
      </div>

      {showCreateAction && selected && (
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            padding: 10,
            borderRadius: "var(--skin-radius, 8px)",
            border: "1px solid var(--skin-line)",
            background: "var(--skin-surface2)",
            flexWrap: "wrap",
          }}
        >
          <select
            className="x-input"
            value={actionKind}
            onChange={(e) => setActionKind(e.target.value as "action" | "artefact")}
            style={{ fontSize: 12, padding: "4px 8px" }}
          >
            <option value="action">Action</option>
            <option value="artefact">Artefact</option>
          </select>
          <input
            className="x-input"
            placeholder="Title…"
            value={actionTitle}
            onChange={(e) => setActionTitle(e.target.value)}
            style={{ flex: 1, minWidth: 160, fontSize: 12 }}
          />
          <button
            type="button"
            className="x-btn-secondary"
            disabled={!actionTitle.trim() || createAction.isPending}
            onClick={() => void createAction.mutate()}
          >
            {createAction.isPending ? "Creating…" : "Create"}
          </button>
        </div>
      )}

      <div
        style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 20, alignItems: "start" }}
      >
        {/* ── Left sub-panel: proof note tabs ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {isLoading ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "var(--skin-ink-faint)",
                fontSize: 13,
                padding: "12px 0",
              }}
            >
              <Loader2 size={14} className="animate-spin" />
              Loading…
            </div>
          ) : (
            proofNotes.map((n) => (
              <div
                key={n.id}
                onClick={() => setSelectedId(n.id)}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 6,
                  padding: "10px 12px",
                  borderRadius: "var(--skin-radius, 8px)",
                  border: "1px solid var(--skin-line)",
                  background:
                    n.id === selectedId ? "var(--skin-accent-soft)" : "var(--skin-surface)",
                  cursor: "pointer",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  {renamingId === n.id ? (
                    <input
                      autoFocus
                      className="x-input"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onBlur={() => {
                        rename.mutate({ id: n.id, title: renameValue });
                        setRenamingId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          rename.mutate({ id: n.id, title: renameValue });
                          setRenamingId(null);
                        }
                        if (e.key === "Escape") setRenamingId(null);
                      }}
                      style={{ fontSize: 13, padding: "2px 6px" }}
                    />
                  ) : (
                    <div
                      className="truncate"
                      style={{
                        fontSize: 13,
                        fontWeight: n.id === selectedId ? 600 : 500,
                        color: n.id === selectedId ? "var(--skin-accent)" : "var(--skin-ink)",
                      }}
                    >
                      {n.title || "Untitled deliverable"}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: "var(--skin-ink-faint)", marginTop: 2 }}>
                    {formatDate(n.created_at)}
                  </div>
                </div>
                <button
                  type="button"
                  className="x-icon-link"
                  title="Rename"
                  onClick={(e) => {
                    e.stopPropagation();
                    setRenamingId(n.id);
                    setRenameValue(n.title);
                  }}
                >
                  <Pencil size={12} />
                </button>
                <button
                  type="button"
                  className="x-icon-link"
                  title="Unlink from this task"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Unlink "${n.title || "this deliverable"}" from this task?`)) {
                      removeTab.mutate(n.id);
                    }
                  }}
                >
                  <X size={12} />
                </button>
              </div>
            ))
          )}

          <button
            type="button"
            className="x-btn-secondary"
            onClick={() => createTab.mutate()}
            disabled={createTab.isPending}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
          >
            <Plus size={13} />
            {createTab.isPending ? "Creating…" : "New Tab"}
          </button>
          <button
            type="button"
            className="x-btn-secondary"
            onClick={() => setShowLinkExisting((v) => !v)}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
          >
            <Link2 size={13} />
            Use existing note
          </button>

          {showLinkExisting && (
            <div
              style={{
                border: "1px solid var(--skin-line)",
                borderRadius: "var(--skin-radius, 8px)",
                padding: 8,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <input
                autoFocus
                className="x-input"
                placeholder="Search your notes…"
                value={linkQuery}
                onChange={(e) => setLinkQuery(e.target.value)}
                style={{ fontSize: 12 }}
              />
              {searching && (
                <Loader2
                  size={12}
                  className="animate-spin"
                  style={{ color: "var(--skin-ink-faint)" }}
                />
              )}
              {searchResults.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => linkExisting.mutate(r.id)}
                  style={{
                    textAlign: "left",
                    fontSize: 12,
                    padding: "4px 6px",
                    background: "none",
                    border: "none",
                    color: "var(--skin-ink)",
                    cursor: "pointer",
                  }}
                >
                  {r.title}
                </button>
              ))}
              {!searching && debouncedLinkQuery.trim() && searchResults.length === 0 && (
                <span style={{ fontSize: 12, color: "var(--skin-ink-faint)" }}>No matches.</span>
              )}
            </div>
          )}
        </div>

        {/* ── Right main panel ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          {!selected ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 240,
                gap: 8,
                color: "var(--skin-ink-faint)",
                border: "1px dashed var(--skin-line)",
                borderRadius: "var(--skin-radius, 10px)",
              }}
            >
              <FileText size={24} style={{ opacity: 0.5 }} />
              <p style={{ fontSize: 13, margin: 0 }}>No deliverables yet — start with "New Tab".</p>
            </div>
          ) : (
            <>
              <div style={{ minHeight: 16, fontSize: 12, color: "var(--skin-ink-faint)" }}>
                {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved" : ""}
              </div>

              <RichTextEditor
                content={body}
                onChange={setBody}
                onAddAttachment={(att) => void saveAttachments([...attachments, att])}
              />

              {/* Attachments — scoped to this proof note, not the task */}
              <div>
                <h4 className="x-preview-title">Attachments ({attachments.length})</h4>
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
                      <a
                        href={a.dataUrl}
                        download={a.name}
                        className="x-icon-link"
                        title="Download"
                      >
                        <Download size={16} />
                      </a>
                      <button
                        className="x-icon-link"
                        onClick={() =>
                          void saveAttachments(attachments.filter((x) => x.id !== a.id))
                        }
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
                    style={{
                      alignSelf: "flex-start",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Paperclip size={13} />
                    Add attachment
                  </button>
                </div>
              </div>

              {/* Dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => void handleDrop(e)}
                style={{
                  border: `1px dashed ${dragOver ? "var(--skin-accent)" : "var(--skin-line)"}`,
                  borderRadius: "var(--skin-radius, 10px)",
                  padding: "20px 12px",
                  textAlign: "center",
                  fontSize: 12,
                  color: "var(--skin-ink-faint)",
                  background: dragOver ? "var(--skin-accent-soft)" : "transparent",
                }}
              >
                Drag file here
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
