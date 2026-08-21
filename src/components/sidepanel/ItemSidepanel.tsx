import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  Link as LinkIcon,
  Loader2,
  MoreVertical,
  Search,
  Sparkles,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { ItemBadge, ItemTypeChip } from "@/components/sidepanel/ItemBadge";
import { ItemGraph } from "@/components/sidepanel/ItemGraph";
import { useSidepanel, type PanelItem } from "@/contexts/sidepanel";
import {
  addNoteObjectiveLink,
  copyItemLink,
  fetchItemGraphData,
  fetchLinkedItemsForNote,
  fetchLinkedItemsForObjective,
  removeNoteObjectiveLink,
  removeObjectiveNoteLink,
  searchItems,
  suggestLinks,
  type ItemKind,
  type LinkedItem,
} from "@/lib/sidepanel-service";
import { updateNote, archiveNote, autoTagNote } from "@/lib/xcamp-api";
import { updateObjective } from "@/lib/navigator-api";
import { supabase } from "@/lib/supabase";
import { useFullscreenTaskStore } from "@/store/fullscreenTaskStore";
import { useAuth } from "@/contexts/auth";
import { useDebounce } from "@/hooks/useDebounce";
import { NoteEditor, type NoteEditorValues } from "@/components/editor/NoteEditor";
import { listProjects } from "@/lib/xcamp-api";
import type { NoteRow } from "@/types/xcamp";

const STATUS_OPTIONS = ["draft", "active", "in_progress", "blocked", "done"] as const;
const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  active: "Active",
  in_progress: "In progress",
  blocked: "Blocked",
  done: "Done",
};

const ALL_ITEM_TYPES = ["note", "task", "idea", "question", "decision", "reference", "objective"];

// ── Breadcrumb ─────────────────────────────────────────────────────────────

function Breadcrumb({
  stack,
  onGoTo,
}: {
  stack: PanelItem[];
  onGoTo: (index: number) => void;
}) {
  const MAX_VISIBLE = 3;
  const crumbs = stack.length > MAX_VISIBLE ? stack.slice(-(MAX_VISIBLE)) : stack;
  const offset = stack.length - crumbs.length;
  const showEllipsis = offset > 0;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap", minWidth: 0 }}>
      {showEllipsis && (
        <>
          <button
            onClick={() => onGoTo(0)}
            style={{ fontSize: 11, color: "var(--skin-ink-faint)", background: "none", border: "none", cursor: "pointer", padding: "2px 4px", borderRadius: 4 }}
          >
            …
          </button>
          <ChevronRight size={10} style={{ color: "var(--skin-ink-faint)", flexShrink: 0 }} />
        </>
      )}
      {crumbs.map((item, i) => {
        const stackIndex = offset + i;
        const isLast = stackIndex === stack.length - 1;
        return (
          <div key={`${item.id}-${stackIndex}`} style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0 }}>
            {i > 0 && <ChevronRight size={10} style={{ color: "var(--skin-ink-faint)", flexShrink: 0 }} />}
            {isLast ? (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--skin-ink)",
                  maxWidth: 140,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {item.title ?? item.kind}
              </span>
            ) : (
              <button
                onClick={() => onGoTo(stackIndex)}
                style={{
                  fontSize: 11,
                  color: "var(--skin-ink-faint)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "2px 4px",
                  borderRadius: 4,
                  maxWidth: 120,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {item.title ?? item.kind}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Linked item row ────────────────────────────────────────────────────────

function LinkedRow({
  item,
  onOpen,
  onRemove,
}: {
  item: LinkedItem;
  onOpen: () => void;
  onRemove: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const typeKey = item.kind === "note" && item.noteType ? item.noteType : item.kind;
  return (
    <div
      className="x-linked-row"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 6, cursor: "pointer", background: hovered ? "var(--skin-surface2)" : "transparent" }}
      onClick={onOpen}
    >
      <ItemBadge kind={item.kind} noteType={item.noteType} />
      <span style={{ flex: 1, fontSize: 13, color: "var(--skin-ink)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {item.title}
      </span>
      {item.status && (
        <span style={{ fontSize: 11, color: "var(--skin-ink-faint)", flexShrink: 0 }}>
          {STATUS_LABELS[item.status] ?? item.status}
        </span>
      )}
      <button
        className="x-linked-row__remove"
        aria-label="Remove link"
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        style={{
          display: hovered ? "flex" : "none",
          alignItems: "center",
          justifyContent: "center",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--skin-ink-faint)",
          padding: 2,
          borderRadius: 4,
          flexShrink: 0,
        }}
      >
        <XCircle size={14} />
      </button>
    </div>
  );
}

// ── Add-link panel ──────────────────────────────────────────────────────────

function AddLinkPanel({
  currentId,
  currentKind,
  linkedIds,
  tenantId,
  onLink,
  onClose,
}: {
  currentId: string;
  currentKind: ItemKind;
  linkedIds: string[];
  tenantId: string;
  onLink: (item: LinkedItem) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [activeTypes, setActiveTypes] = useState<string[]>([]);
  const debouncedQuery = useDebounce(query, 300);

  const kindsToSearch: ItemKind[] = activeTypes.length === 0
    ? (currentKind === "note" ? ["objective"] : ["note"])
    : activeTypes.filter((t): t is ItemKind => t === "note" || t === "objective");

  const { data: results = [], isFetching } = useQuery({
    queryKey: ["item-search", debouncedQuery, activeTypes, currentId, tenantId],
    queryFn: () => searchItems(debouncedQuery, kindsToSearch, [currentId, ...linkedIds], tenantId),
    enabled: debouncedQuery.length > 0,
  });

  const toggleType = (t: string) =>
    setActiveTypes((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);

  return (
    <div className="x-add-link-panel" style={{ border: "1px solid var(--skin-line)", borderRadius: 8, padding: 12, background: "var(--skin-surface2)", marginTop: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", flex: 1, gap: 6, background: "var(--skin-surface)", border: "1px solid var(--skin-line)", borderRadius: 6, padding: "5px 8px" }}>
          <Search size={13} style={{ color: "var(--skin-ink-faint)", flexShrink: 0 }} />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search items to link…"
            style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 13, color: "var(--skin-ink)" }}
          />
          {isFetching && <Loader2 size={12} className="animate-spin" style={{ color: "var(--skin-ink-faint)" }} />}
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--skin-ink-faint)", padding: 4 }}>
          <X size={14} />
        </button>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        {(currentKind === "note" ? ["objective"] : ["note", "task", "idea", "question", "decision", "reference"]).map((t) => (
          <ItemTypeChip key={t} typeKey={t} active={activeTypes.includes(t)} onClick={() => toggleType(t)} />
        ))}
      </div>

      {query.length === 0 ? (
        <p style={{ fontSize: 12, color: "var(--skin-ink-faint)", margin: 0 }}>Type to search…</p>
      ) : results.length === 0 && !isFetching ? (
        <p style={{ fontSize: 12, color: "var(--skin-ink-faint)", margin: 0 }}>No results found.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {results.map((r) => (
            <button
              key={r.id}
              onClick={() => onLink(r)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 8px",
                borderRadius: 6,
                background: "none",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                width: "100%",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--skin-surface)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
            >
              <ItemBadge kind={r.kind} noteType={r.noteType} />
              <span style={{ fontSize: 13, color: "var(--skin-ink)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {r.title}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Linked items tab ───────────────────────────────────────────────────────

export function LinkedItemsTab({
  itemId,
  itemKind,
}: {
  itemId: string;
  itemKind: ItemKind;
}) {
  const { user } = useAuth();
  const { push } = useSidepanel();
  const qc = useQueryClient();
  const [showAddLink, setShowAddLink] = useState(false);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filterType, setFilterType] = useState<string | null>(null);
  const [suggesting, setSuggesting] = useState(false);

  const linkedKey = ["linked-items", itemId, itemKind];
  const { data: linked = [], isLoading: loadingLinked } = useQuery({
    queryKey: linkedKey,
    queryFn: () =>
      itemKind === "note"
        ? fetchLinkedItemsForNote(itemId)
        : fetchLinkedItemsForObjective(itemId),
  });

  const graphKey = ["item-graph", itemId, itemKind];
  const { data: graphData } = useQuery({
    queryKey: graphKey,
    queryFn: () => fetchItemGraphData(itemId, itemKind),
  });

  const addLink = useMutation({
    mutationFn: async (target: LinkedItem) => {
      if (!user) throw new Error("Not authenticated");
      if (itemKind === "note") {
        if (target.kind !== "objective") throw new Error("Notes can only link to objectives");
        await addNoteObjectiveLink(user, itemId, target.id);
      } else {
        if (target.kind !== "note") throw new Error("Objectives can only link to notes");
        await addNoteObjectiveLink(user, target.id, itemId);
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: linkedKey });
      void qc.invalidateQueries({ queryKey: graphKey });
      setShowAddLink(false);
    },
  });

  const removeLink = useMutation({
    mutationFn: async (target: LinkedItem) => {
      if (itemKind === "note") {
        await removeNoteObjectiveLink(itemId, target.id);
      } else {
        await removeObjectiveNoteLink(itemId, target.id);
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: linkedKey });
      void qc.invalidateQueries({ queryKey: graphKey });
    },
  });

  const handleSuggest = async () => {
    if (!user) return;
    setSuggesting(true);
    try {
      const suggested = await suggestLinks(user, itemId, itemKind);
      if (suggested.length === 0) {
        alert("No suggestions available yet.");
      }
    } finally {
      setSuggesting(false);
    }
  };

  const filteredLinked = useMemo(() => {
    let items = linked;
    if (filterType) {
      items = items.filter((item) => {
        const typeKey = item.kind === "note" && item.noteType ? item.noteType : item.kind;
        return typeKey === filterType;
      });
    }
    return [...items].sort((a, b) =>
      sortDir === "asc"
        ? a.title.localeCompare(b.title)
        : b.title.localeCompare(a.title),
    );
  }, [linked, filterType, sortDir]);

  const linkedIds = useMemo(() => linked.map((l) => l.id), [linked]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <button
          onClick={() => setShowAddLink((v) => !v)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "5px 12px",
            borderRadius: 6,
            border: "1px solid var(--skin-line)",
            background: "var(--skin-surface2)",
            color: "var(--skin-ink)",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          <LinkIcon size={12} />
          Add link
        </button>
        <button
          onClick={handleSuggest}
          disabled={suggesting}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "5px 12px",
            borderRadius: 6,
            border: "1px solid var(--skin-line)",
            background: "var(--skin-surface2)",
            color: "var(--skin-ink)",
            cursor: suggesting ? "wait" : "pointer",
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          {suggesting ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Sparkles size={12} />
          )}
          Suggest links
        </button>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
          style={{ background: "none", border: "none", fontSize: 11, color: "var(--skin-ink-faint)", cursor: "pointer" }}
        >
          {sortDir === "asc" ? "A–Z" : "Z–A"}
        </button>
      </div>

      {/* Type filter chips */}
      {linked.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <ItemTypeChip
            typeKey="all"
            active={filterType === null}
            onClick={() => setFilterType(null)}
          />
          {[...new Set(linked.map((l) => (l.kind === "note" && l.noteType ? l.noteType : l.kind)))].map((t) => (
            <ItemTypeChip key={t} typeKey={t} active={filterType === t} onClick={() => setFilterType(filterType === t ? null : t)} />
          ))}
        </div>
      )}

      {/* Add link panel */}
      {showAddLink && user && (
        <AddLinkPanel
          currentId={itemId}
          currentKind={itemKind}
          linkedIds={linkedIds}
          tenantId={user.tenantId}
          onLink={(item) => addLink.mutate(item)}
          onClose={() => setShowAddLink(false)}
        />
      )}

      {/* Linked items list */}
      {loadingLinked ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--skin-ink-faint)", fontSize: 13, padding: "16px 0" }}>
          <Loader2 size={14} className="animate-spin" />
          Loading…
        </div>
      ) : filteredLinked.length === 0 && !showAddLink ? (
        <p style={{ fontSize: 13, color: "var(--skin-ink-faint)", margin: 0 }}>
          No linked items yet. Click "Add link" to connect this item.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {filteredLinked.map((item) => (
            <LinkedRow
              key={item.id}
              item={item}
              onOpen={() => push({ id: item.id, kind: item.kind, title: item.title, noteType: item.noteType })}
              onRemove={() => removeLink.mutate(item)}
            />
          ))}
        </div>
      )}

      {/* Graph */}
      {graphData && graphData.nodes.length > 1 && (
        <div style={{ marginTop: 8 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "var(--skin-ink-faint)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px" }}>
            Relationship graph
          </p>
          <ItemGraph
            nodes={graphData.nodes}
            edges={graphData.edges}
            centerId={itemId}
            onOpenItem={(id, kind) => push({ id, kind })}
          />
        </div>
      )}
    </div>
  );
}

// ── Objective content ───────────────────────────────────────────────────────

function ObjectiveContent({ itemId }: { itemId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: objective, isLoading } = useQuery({
    queryKey: ["objective-detail", itemId],
    queryFn: async () => {
      const { data } = await supabase
        .from("objectives")
        .select("id, title, description, status, tags")
        .eq("id", itemId)
        .single();
      return data as { id: string; title: string; description: string | null; status: string | null; tags: string[] | null } | null;
    },
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("draft");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [autoTagging, setAutoTagging] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  const initialised = useRef(false);
  useEffect(() => {
    if (objective && !initialised.current) {
      initialised.current = true;
      setTitle(objective.title ?? "");
      setDescription(objective.description ?? "");
      setStatus(objective.status ?? "draft");
      setTags(objective.tags ?? []);
    }
  }, [objective]);

  const debouncedTitle = useDebounce(title, 1200);
  const debouncedDescription = useDebounce(description, 1200);

  const prevTitle = useRef(title);
  const prevDescription = useRef(description);
  const initialLoadDone = useRef(false);

  useEffect(() => {
    if (!objective) return;
    if (!initialLoadDone.current) { initialLoadDone.current = true; return; }
    if (debouncedTitle === prevTitle.current && debouncedDescription === prevDescription.current) return;
    if (!user) return;
    prevTitle.current = debouncedTitle;
    prevDescription.current = debouncedDescription;
    setSaveStatus("saving");
    updateObjective(user, itemId, {
      title: debouncedTitle.trim() || "Untitled objective",
      description: debouncedDescription.trim() || null,
      status,
    })
      .then(() => {
        void qc.invalidateQueries({ queryKey: ["objective-detail", itemId] });
        void qc.invalidateQueries({ queryKey: ["nav-objectives"] });
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus((s) => (s === "saved" ? "idle" : s)), 2000);
      })
      .catch(console.error);
  }, [debouncedTitle, debouncedDescription]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveStatus_ = useRef(status);
  const handleStatusChange = async (newStatus: string) => {
    setStatus(newStatus);
    saveStatus_.current = newStatus;
    if (!user || !objective) return;
    await updateObjective(user, itemId, {
      title: title.trim() || "Untitled objective",
      description: description.trim() || null,
      status: newStatus,
    }).catch(console.error);
    void qc.invalidateQueries({ queryKey: ["objective-detail", itemId] });
    void qc.invalidateQueries({ queryKey: ["nav-objectives"] });
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  };

  const handleAutoTag = async () => {
    if (!user || !objective) return;
    setAutoTagging(true);
    try {
      const bodyHtml = description ? `<p>${description}</p>` : "";
      const suggested = await autoTagNote(user, itemId, title, bodyHtml);
      if (suggested.length) setTags(suggested);
    } catch (e) {
      console.error("Auto-tag failed", e);
    } finally {
      setAutoTagging(false);
    }
  };

  if (isLoading || !objective) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--skin-ink-faint)", padding: "24px 0" }}>
        <Loader2 size={16} className="animate-spin" />
        Loading…
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Save status indicator */}
      {saveStatus !== "idle" && (
        <span style={{ fontSize: 12, color: "var(--skin-ink-faint)" }}>
          {saveStatus === "saving" ? "Saving…" : "Saved"}
        </span>
      )}

      {/* Title */}
      <input
        className="x-input"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Objective title"
        style={{ width: "100%", fontSize: 18, fontWeight: 700, padding: "8px 10px" }}
      />

      {/* Status */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <label style={{ fontSize: 12, fontWeight: 500, color: "var(--skin-ink-faint)", minWidth: 60 }}>Status</label>
        <select
          value={status}
          onChange={(e) => void handleStatusChange(e.target.value)}
          className="x-input"
          style={{ fontSize: 13, padding: "4px 8px" }}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>

      {/* Tags */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 500, color: "var(--skin-ink-faint)", flex: 1 }}>Tags</label>
          <button
            onClick={handleAutoTag}
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
            {autoTagging ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
            Auto-tag
          </button>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          {tags.map((t) => (
            <span
              key={t}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 12,
                padding: "3px 8px",
                borderRadius: 99,
                background: "var(--skin-surface2)",
                border: "1px solid var(--skin-line)",
                color: "var(--skin-ink)",
              }}
            >
              {t}
              <button
                onClick={() => setTags(tags.filter((x) => x !== t))}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "var(--skin-ink-faint)", display: "flex" }}
              >
                <X size={10} />
              </button>
            </span>
          ))}
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); }
            }}
            placeholder="Add tag…"
            style={{
              fontSize: 12,
              background: "none",
              border: "1px dashed var(--skin-line)",
              borderRadius: 99,
              padding: "3px 10px",
              outline: "none",
              color: "var(--skin-ink)",
              minWidth: 80,
            }}
          />
        </div>
      </div>

      {/* Description */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={{ fontSize: 12, fontWeight: 500, color: "var(--skin-ink-faint)" }}>Description</label>
        <RichTextEditor
          content={description}
          onChange={setDescription}
          onAddAttachment={() => {}}
        />
      </div>
    </div>
  );
}

// ── Note content ────────────────────────────────────────────────────────────

function NoteContent({ itemId }: { itemId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [noteRow, setNoteRow] = useState<NoteRow | null>(null);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [archiving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setNoteRow(null);
    Promise.all([
      supabase
        .from("notes")
        .select("id, title, body_html, body_markdown, note_type, tags, detail, tenant_id, owner_central_id, created_at, updated_at, done")
        .eq("id", itemId)
        .single(),
      listProjects(user),
    ]).then(([{ data }, projs]) => {
      if (data) {
        const raw = data as unknown as Record<string, unknown>;
        setNoteRow({ ...raw, created_by: raw.owner_central_id } as unknown as NoteRow);
      }
      setProjects(projs);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [itemId, user?.centralId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async (v: NoteEditorValues) => {
    if (!user || !noteRow) return;
    setSaving(true);
    try {
      await updateNote(user, itemId, { ...v, existingDetail: (noteRow.detail as Record<string, unknown>) ?? {} });
      void qc.invalidateQueries({ queryKey: ["notes"] });
      void qc.invalidateQueries({ queryKey: ["nav-tasks"] });
    } catch (e) {
      console.error("NoteContent save failed", e);
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!user || !noteRow) return;
    try {
      await archiveNote(user, noteRow);
      void qc.invalidateQueries({ queryKey: ["notes"] });
    } catch (e) {
      console.error("Archive failed", e);
    }
  };

  if (loading || !noteRow) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--skin-ink-faint)", padding: "24px 0" }}>
        <Loader2 size={16} className="animate-spin" />
        Loading…
      </div>
    );
  }

  return (
    <NoteEditor
      editing={{ mode: "edit", note: noteRow }}
      projects={projects}
      user={user!}
      saving={saving}
      archiving={archiving}
      onSave={handleSave}
      onCancel={() => {}}
      onArchive={handleArchive}
      embedded
    />
  );
}

// ── Main panel ─────────────────────────────────────────────────────────────
// Renders directly into the AppShell layout aside — no Sheet/overlay wrapper.

export function ItemSidepanel() {
  const { stack, current, pop, close, goTo, push } = useSidepanel();
  const [activeTab, setActiveTab] = useState<"content" | "linked">("content");

  useEffect(() => {
    setActiveTab("content");
  }, [current?.id]);

  const handleOpenItem = useCallback(
    (id: string, kind: ItemKind) => {
      push({ id, kind });
    },
    [push],
  );

  if (!current) return null;

  const canGoBack = stack.length > 1;
  const typeLabel =
    current.kind === "objective" ? "Editing objective" : `Editing ${current.kind}`;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        overflow: "hidden",
        background: "var(--skin-surface)",
      }}
    >
      {/* ── Header ── */}
      <div
        className="x-sidepanel-header"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 14px",
          borderBottom: "1px solid var(--skin-line)",
          background: "var(--skin-surface2)",
          flexShrink: 0,
        }}
      >
        <Breadcrumb stack={stack} onGoTo={goTo} />
        <div style={{ flex: 1 }} />
        <button
          onClick={close}
          aria-label="Close panel"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--skin-ink-faint)",
            display: "flex",
            alignItems: "center",
            padding: 4,
            borderRadius: 4,
          }}
        >
          <X size={15} />
        </button>
      </div>

      {/* ── Body card header ── */}
      <div
        className="x-sidepanel-body-header"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 14px",
          borderBottom: "1px solid var(--skin-line)",
          flexShrink: 0,
        }}
      >
        {canGoBack && (
          <button
            onClick={pop}
            aria-label="Go back"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "none",
              border: "1px solid var(--skin-line)",
              borderRadius: 6,
              padding: "4px 6px",
              cursor: "pointer",
              color: "var(--skin-ink-faint)",
            }}
          >
            <ArrowLeft size={13} />
          </button>
        )}
        <span style={{ fontSize: 12, fontWeight: 500, color: "var(--skin-ink-faint)", flex: 1 }}>
          {typeLabel}
        </span>
        <FullscreenButton item={current} />
        <KebabMenu item={current} onClose={close} />
      </div>

      {/* ── Tabs ── */}
      <div
        className="x-sidepanel-tabs"
        style={{
          display: "flex",
          gap: 0,
          borderBottom: "1px solid var(--skin-line)",
          flexShrink: 0,
        }}
      >
        {(["content", "linked"] as const).map((tab) => (
          <button
            key={tab}
            className="x-sidepanel-tab"
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: activeTab === tab ? 600 : 400,
              color: activeTab === tab ? "var(--skin-accent)" : "var(--skin-ink-soft)",
              background: "none",
              border: "none",
              borderBottom: activeTab === tab ? "2px solid var(--skin-accent)" : "2px solid transparent",
              marginBottom: -1,
              cursor: "pointer",
              textTransform: "capitalize",
              letterSpacing: "0.01em",
            }}
          >
            {tab === "linked" ? "Linked items" : "Content"}
          </button>
        ))}
      </div>

      {/* ── Scrollable body ── */}
      <div
        className="x-sidepanel-scroll"
        style={{ flex: 1, overflowY: "auto", padding: 16 }}
      >
        {activeTab === "content" ? (
          current.kind === "objective" ? (
            <ObjectiveContent key={current.id} itemId={current.id} />
          ) : (
            <NoteContent key={current.id} itemId={current.id} />
          )
        ) : (
          <LinkedItemsTab
            key={current.id}
            itemId={current.id}
            itemKind={current.kind}
          />
        )}
      </div>
    </div>
  );
}

// ── Fullscreen control ──────────────────────────────────────────────────────
// Tasks can be opened in the fullscreen modal. This used to be reachable only
// via the kebab menu, which made "open a Navigator task fullscreen" a
// three-interaction flow (open panel → open menu → pick item). Surfacing it in
// the header makes it one visible click from the panel.

function FullscreenButton({ item }: { item: PanelItem }) {
  if (!(item.kind === "note" && item.noteType === "task")) return null;

  return (
    <button
      onClick={() => useFullscreenTaskStore.getState().open(item.id)}
      aria-label="Open fullscreen"
      title="Open fullscreen"
      data-testid="sidepanel-open-fullscreen"
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        color: "var(--skin-ink-faint)",
        display: "flex",
        alignItems: "center",
        padding: 4,
        borderRadius: 4,
      }}
    >
      <ExternalLink size={15} />
    </button>
  );
}

// ── Kebab menu ──────────────────────────────────────────────────────────────

function KebabMenu({ item, onClose }: { item: PanelItem; onClose: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const handleDelete = async () => {
    if (!user || !confirm("Delete this item? This action cannot be undone.")) return;
    if (item.kind === "note") {
      const { data } = await supabase.from("notes").select("id, title, note_type, tags, detail, tenant_id, owner_central_id, created_at, updated_at, done, body_html, body_markdown").eq("id", item.id).single();
      if (data) {
        const raw = data as unknown as Record<string, unknown>;
        const row = { ...raw, created_by: raw.owner_central_id } as unknown as NoteRow;
        await archiveNote(user, row).catch(console.error);
        void qc.invalidateQueries({ queryKey: ["notes"] });
      }
    } else {
      const { error: delErr } = await supabase.from("objectives").delete().eq("id", item.id);
      if (delErr) console.error(delErr);
      void qc.invalidateQueries({ queryKey: ["nav-objectives"] });
    }
    onClose();
  };

  const handleCopyLink = () => copyItemLink(item.id, item.kind);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="More actions"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--skin-ink-faint)",
            display: "flex",
            alignItems: "center",
            padding: 4,
            borderRadius: 4,
          }}
        >
          <MoreVertical size={15} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" style={{ minWidth: 180 }}>
        {/* "Open fullscreen" now lives in the panel header as an always-visible
            control (see FullscreenButton) rather than buried behind this menu. */}
        <DropdownMenuItem onClick={handleCopyLink} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <LinkIcon size={13} />
          Copy link
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {item.kind === "note" && (
          <DropdownMenuItem
            onClick={() => alert("Promote to objective: not yet implemented")}
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <Sparkles size={13} />
            Promote to Objective
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => void handleDelete()}
          style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--skin-danger, #d4524e)" }}
        >
          <Trash2 size={13} />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
