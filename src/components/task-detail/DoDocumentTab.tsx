import { useEffect, useRef, useState } from "react";
import { Sparkles, Users2, Paperclip, X, FileText, Download } from "lucide-react";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { MAX_ATTACHMENT_BYTES } from "@/components/editor/RichTextEditor";
import { useDebounce } from "@/hooks/useDebounce";
import type { NoteAttachment, NoteRow, XcampUser } from "@/types/xcamp";

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

interface DoDocumentBlob {
  notes?: string;
}

// Sub-tabs: the approved mockup names sub-tabs for this area, but the mockup
// file wasn't available in this session to read them from. This ships one
// real section ("Notes") plus the two AI stub buttons the brief specified —
// the sub-tab rail is here and ready, but its remaining entries need a follow-up
// pass against the actual mockup rather than invented placeholder names.
const SUB_TABS = [{ key: "notes", label: "Notes" }] as const;

export function DoDocumentTab({
  noteRow,
  user,
  onSaved,
  patchDetail,
}: {
  noteRow: NoteRow;
  user: XcampUser;
  onSaved: () => void;
  patchDetail: (patch: Record<string, unknown>) => Promise<void>;
}) {
  const [subTab, setSubTab] = useState<(typeof SUB_TABS)[number]["key"]>("notes");
  const blob = (noteRow.detail?.doDocument as DoDocumentBlob | undefined) ?? {};
  const [body, setBody] = useState(blob.notes ?? "");
  const [attachments, setAttachments] = useState<NoteAttachment[]>(
    (noteRow.detail?.attachments as NoteAttachment[] | undefined) ?? [],
  );
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  const debouncedBody = useDebounce(body, 1500);
  const initialBodyRef = useRef(body);
  const firstRun = useRef(true);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    if (debouncedBody === initialBodyRef.current) return;
    initialBodyRef.current = debouncedBody;
    setSaveStatus("saving");
    patchDetail({ doDocument: { ...blob, notes: debouncedBody } })
      .then(() => {
        setSaveStatus("saved");
        onSaved();
        setTimeout(() => setSaveStatus((s) => (s === "saved" ? "idle" : s)), 2000);
      })
      .catch((e) => {
        console.error("Do & Document autosave failed", e);
        setSaveStatus("idle");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedBody]);

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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Sub-tabs */}
      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--skin-line)" }}>
        {SUB_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setSubTab(t.key)}
            style={{
              padding: "8px 14px",
              fontSize: 13,
              fontWeight: subTab === t.key ? 600 : 400,
              color: subTab === t.key ? "var(--skin-accent)" : "var(--skin-ink-soft)",
              background: "none",
              border: "none",
              borderBottom:
                subTab === t.key ? "2px solid var(--skin-accent)" : "2px solid transparent",
              marginBottom: -1,
              cursor: "pointer",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* AI action stubs */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
          title="Not available yet"
        >
          <Sparkles size={13} />
          Connect your work
        </button>
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
          title="Not available yet"
        >
          <Users2 size={13} />
          Find a collaborator
        </button>
      </div>

      <div style={{ minHeight: 16, fontSize: 12, color: "var(--skin-ink-faint)" }}>
        {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved" : ""}
      </div>

      <RichTextEditor
        content={body}
        onChange={setBody}
        onAddAttachment={(att) => void saveAttachments([...attachments, att])}
      />

      {/* Attachments — shares notes.detail.attachments with the About tab's Attachments accordion */}
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
      </div>
    </div>
  );
}
