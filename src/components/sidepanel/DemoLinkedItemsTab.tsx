import { useMemo, useState } from "react";
import { Link as LinkIcon, Search, X, XCircle } from "lucide-react";
import { ItemBadge } from "@/components/sidepanel/ItemBadge";
import { useSidepanel } from "@/contexts/sidepanel";
import type { ItemKind, LinkedItem } from "@/lib/sidepanel-service";
import {
  linkedObjectiveIdsForTask,
  linkedTaskIdsForObjective,
  useDemoItemsStore,
} from "@/store/demoItemsStore";

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  active: "Active",
  in_progress: "In progress",
  blocked: "Blocked",
  done: "Done",
  open: "Open",
  suggested: "Suggested",
  inactive: "Inactive",
  completed: "Completed",
};

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
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onOpen}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "7px 10px",
        borderRadius: 6,
        cursor: "pointer",
        background: hovered ? "var(--skin-surface2)" : "transparent",
      }}
    >
      <ItemBadge kind={item.kind} noteType={item.noteType} />
      <span
        style={{
          flex: 1,
          fontSize: 13,
          color: "var(--skin-ink)",
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {item.title}
      </span>
      {item.status && (
        <span style={{ fontSize: 11, color: "var(--skin-ink-faint)", flexShrink: 0 }}>
          {STATUS_LABELS[item.status] ?? item.status}
        </span>
      )}
      <button
        aria-label="Remove link"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
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

// Demo counterpart to ItemSidepanel's LinkedItemsTab. An objective's linked
// items are its demo tasks (Task.objectiveId, see fixtures/objectives.ts)
// plus any ad-hoc links added here; a task's linked items are its parent
// objective plus ad-hoc links — see linkedTaskIdsForObjective /
// linkedObjectiveIdsForTask in the demo store. All adds/removes are local
// store writes; nothing here calls addNoteObjectiveLink/removeNoteObjectiveLink.
export function DemoLinkedItemsTab({ itemId, itemKind }: { itemId: string; itemKind: ItemKind }) {
  const { push } = useSidepanel();
  const objectives = useDemoItemsStore((s) => s.objectives);
  const tasks = useDemoItemsStore((s) => s.tasks);
  const linkObjectiveTask = useDemoItemsStore((s) => s.linkObjectiveTask);
  const unlinkObjectiveTask = useDemoItemsStore((s) => s.unlinkObjectiveTask);
  const [showAddLink, setShowAddLink] = useState(false);
  const [query, setQuery] = useState("");

  const isObjective = itemKind === "objective";

  const linked: LinkedItem[] = useMemo(() => {
    if (isObjective) {
      const obj = objectives[itemId];
      if (!obj) return [];
      return linkedTaskIdsForObjective(obj)
        .map((id) => tasks[id])
        .filter((t): t is NonNullable<typeof t> => !!t && !t.deleted)
        .map((t) => ({
          id: t.id,
          title: t.title,
          kind: "note" as const,
          noteType: "task",
          status: t.status,
        }));
    }
    const task = tasks[itemId];
    if (!task) return [];
    return linkedObjectiveIdsForTask(task)
      .map((id) => objectives[id])
      .filter((o): o is NonNullable<typeof o> => !!o && !o.deleted)
      .map((o) => ({ id: o.id, title: o.title, kind: "objective" as const, status: o.status }));
  }, [isObjective, itemId, objectives, tasks]);

  const linkedIds = useMemo(() => new Set(linked.map((l) => l.id)), [linked]);

  const results: LinkedItem[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    if (isObjective) {
      return Object.values(tasks)
        .filter((t) => !t.deleted && !linkedIds.has(t.id) && t.title.toLowerCase().includes(q))
        .slice(0, 8)
        .map((t) => ({
          id: t.id,
          title: t.title,
          kind: "note" as const,
          noteType: "task",
          status: t.status,
        }));
    }
    return Object.values(objectives)
      .filter(
        (o) =>
          !o.deleted &&
          o.id !== itemId &&
          !linkedIds.has(o.id) &&
          o.title.toLowerCase().includes(q),
      )
      .slice(0, 8)
      .map((o) => ({ id: o.id, title: o.title, kind: "objective" as const, status: o.status }));
  }, [query, isObjective, tasks, objectives, linkedIds, itemId]);

  const handleLink = (item: LinkedItem) => {
    if (isObjective) linkObjectiveTask(itemId, item.id);
    else linkObjectiveTask(item.id, itemId);
    setShowAddLink(false);
    setQuery("");
  };

  const handleRemove = (item: LinkedItem) => {
    if (isObjective) unlinkObjectiveTask(itemId, item.id);
    else unlinkObjectiveTask(item.id, itemId);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
      </div>

      {showAddLink && (
        <div
          style={{
            border: "1px solid var(--skin-line)",
            borderRadius: 8,
            padding: 12,
            background: "var(--skin-surface2)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "var(--skin-surface)",
              border: "1px solid var(--skin-line)",
              borderRadius: 6,
              padding: "5px 8px",
              marginBottom: 8,
            }}
          >
            <Search size={13} style={{ color: "var(--skin-ink-faint)", flexShrink: 0 }} />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={isObjective ? "Search tasks to link…" : "Search objectives to link…"}
              style={{
                flex: 1,
                background: "none",
                border: "none",
                outline: "none",
                fontSize: 13,
                color: "var(--skin-ink)",
              }}
            />
            <button
              onClick={() => setShowAddLink(false)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--skin-ink-faint)",
              }}
            >
              <X size={14} />
            </button>
          </div>
          {query.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--skin-ink-faint)", margin: 0 }}>
              Type to search…
            </p>
          ) : results.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--skin-ink-faint)", margin: 0 }}>
              No results found.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {results.map((r) => (
                <button
                  key={r.id}
                  onClick={() => handleLink(r)}
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
                >
                  <ItemBadge kind={r.kind} noteType={r.noteType} />
                  <span style={{ fontSize: 13, color: "var(--skin-ink)", flex: 1, minWidth: 0 }}>
                    {r.title}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {linked.length === 0 && !showAddLink ? (
        <p style={{ fontSize: 13, color: "var(--skin-ink-faint)", margin: 0 }}>
          No linked items yet. Click "Add link" to connect this item.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {linked.map((item) => (
            <LinkedRow
              key={item.id}
              item={item}
              onOpen={() =>
                push({ id: item.id, kind: item.kind, title: item.title, noteType: item.noteType })
              }
              onRemove={() => handleRemove(item)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
