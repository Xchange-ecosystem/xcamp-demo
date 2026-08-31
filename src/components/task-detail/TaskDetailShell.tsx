import { useState } from "react";
import { ChevronLeft, CheckCircle2, Trash2 } from "lucide-react";
import { TASK_TABS, type TaskTabKey } from "./tabs";
import { AboutTab } from "./AboutTab";
import { DoDocumentTab } from "./DoDocumentTab";
import { MatchCollaborateTab } from "./MatchCollaborateTab";
import { LinkedItemsTab } from "@/components/sidepanel/ItemSidepanel";
import { ComingSoonTab } from "./ComingSoonTab";
import type { TaskLabelObjective } from "@/lib/xcamp-api";
import type { NoteRow, XcampUser } from "@/types/xcamp";

export function TaskDetailShell({
  noteRow,
  labels,
  ownerName,
  user,
  onClose,
  onSaved,
  patchDetail,
  onRemove,
  onComplete,
  removing,
}: {
  noteRow: NoteRow;
  labels: TaskLabelObjective[];
  ownerName: string | null;
  user: XcampUser;
  onClose: () => void;
  onSaved: () => void;
  patchDetail: (patch: Record<string, unknown>) => Promise<void>;
  onRemove: () => void;
  onComplete: () => void;
  removing: boolean;
}) {
  const [activeTab, setActiveTab] = useState<TaskTabKey>("about");

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--skin-surface)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 20px",
          borderBottom: "1px solid var(--skin-line)",
          background: "var(--skin-surface2)",
          flexShrink: 0,
        }}
      >
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--skin-ink-faint)",
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 13,
            padding: "4px 8px 4px 4px",
            borderRadius: 6,
          }}
        >
          <ChevronLeft size={15} />
          Close
        </button>
        <span style={{ fontSize: 12, color: "var(--skin-ink-faint)" }}>·</span>
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "var(--skin-ink)",
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {noteRow.title || "Untitled task"}
        </span>
        {/* Task-level status pill — notes.done is sufficient per standing decision. */}
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            padding: "3px 10px",
            borderRadius: "var(--skin-radius-pill)",
            background: noteRow.done ? "var(--skin-good-soft)" : "var(--skin-accent-soft)",
            color: noteRow.done ? "var(--skin-good)" : "var(--skin-accent)",
          }}
        >
          {noteRow.done ? "Done" : "Open"}
        </span>
      </div>

      {/* Body: left rail + tab content */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "220px 1fr",
          overflow: "hidden",
          minHeight: 0,
        }}
      >
        {/* Left rail */}
        <div
          style={{
            borderRight: "1px solid var(--skin-line)",
            background: "var(--skin-surface2)",
            display: "flex",
            flexDirection: "column",
            padding: "12px 8px",
            overflowY: "auto",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
            {TASK_TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  disabled={tab.inactive}
                  onClick={() => setActiveTab(tab.key)}
                  title={tab.inactive ? "Coming soon" : undefined}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 10px",
                    borderRadius: "var(--skin-radius, 8px)",
                    border: "none",
                    background: active ? "var(--skin-accent-soft)" : "transparent",
                    color: tab.inactive
                      ? "var(--skin-ink-faint)"
                      : active
                        ? "var(--skin-accent)"
                        : "var(--skin-ink-soft)",
                    fontSize: 13,
                    fontWeight: active ? 600 : 500,
                    cursor: tab.inactive ? "not-allowed" : "pointer",
                    textAlign: "left",
                    opacity: tab.inactive ? 0.6 : 1,
                  }}
                >
                  <Icon size={15} style={{ flexShrink: 0 }} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Persistent Remove Task / Complete Task buttons */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              paddingTop: 10,
              borderTop: "1px solid var(--skin-line)",
            }}
          >
            <button
              type="button"
              onClick={onComplete}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 10px",
                borderRadius: "var(--skin-radius, 8px)",
                border: "none",
                background: "transparent",
                color: "var(--skin-good)",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <CheckCircle2 size={15} />
              {noteRow.done ? "Reopen task" : "Complete task"}
            </button>
            <button
              type="button"
              onClick={onRemove}
              disabled={removing}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 10px",
                borderRadius: "var(--skin-radius, 8px)",
                border: "none",
                background: "transparent",
                color: "var(--skin-bad)",
                fontSize: 13,
                fontWeight: 500,
                cursor: removing ? "wait" : "pointer",
                textAlign: "left",
                opacity: removing ? 0.6 : 1,
              }}
            >
              <Trash2 size={15} />
              {removing ? "Removing…" : "Remove task"}
            </button>
          </div>
        </div>

        {/* Tab content */}
        <div style={{ overflowY: "auto", padding: "24px 32px" }}>
          {activeTab === "about" && (
            <AboutTab
              noteRow={noteRow}
              labels={labels}
              ownerName={ownerName}
              user={user}
              onSaved={onSaved}
              patchDetail={patchDetail}
            />
          )}
          {activeTab === "do-document" && (
            <DoDocumentTab
              noteRow={noteRow}
              user={user}
              onSaved={onSaved}
              patchDetail={patchDetail}
            />
          )}
          {activeTab === "match-collaborate" && <MatchCollaborateTab />}
          {activeTab === "linked-items" && <LinkedItemsTab itemId={noteRow.id} itemKind="note" />}
          {activeTab === "actions-artifacts" && (
            <ComingSoonTab icon={TASK_TABS[4].icon} label={TASK_TABS[4].label} />
          )}
          {activeTab === "review-complete" && (
            <ComingSoonTab icon={TASK_TABS[5].icon} label={TASK_TABS[5].label} />
          )}
        </div>
      </div>
    </div>
  );
}
