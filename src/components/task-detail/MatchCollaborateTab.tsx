import { Users } from "lucide-react";
import { isDemoTaskId } from "@/lib/demo-items";
import { useDemoItemsStore } from "@/store/demoItemsStore";
import { getPersonById } from "@/fixtures/people";
import { avatarColor, initials } from "@/lib/avatarColor";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { CollaboratorStatus } from "@/store/demoTaskMockContent";

// Real (non-demo) tasks have no assignment data anywhere in this app yet —
// Fabian is still reconsidering whether task-level assignment should exist
// at all (vs. only objective level). That's still true of the shipped
// product, so the banner below stays for every task, demo or real — this is
// a deliberate "flagged, not silently dropped" call (see the CC brief's
// Scope E1 instruction on this exact banner): only the *rows underneath* it
// are new, and only for demo task ids, whose mock content already lives in
// the shared store (see demoTaskMockContent.ts) — this renders that, it
// doesn't invent its own.
const STATUS_LABEL: Record<CollaboratorStatus, string> = {
  invited: "Invited",
  active: "Active",
  confirmed: "Confirmed",
};
const STATUS_COLOR: Record<CollaboratorStatus, string> = {
  invited: "var(--skin-ink-faint, var(--muted-foreground))",
  active: "var(--skin-accent)",
  confirmed: "var(--skin-good)",
};

export function MatchCollaborateTab({ taskId }: { taskId: string }) {
  const isDemo = isDemoTaskId(taskId);
  const collaborators = useDemoItemsStore((s) =>
    isDemo ? s.tasks[taskId]?.collaborators : undefined,
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          padding: "12px 14px",
          borderRadius: "var(--skin-radius, 10px)",
          border: "1px solid var(--skin-line)",
          background: "var(--skin-surface2)",
        }}
      >
        <Users size={16} style={{ color: "var(--skin-ink-faint)", flexShrink: 0, marginTop: 2 }} />
        <p style={{ fontSize: 13, color: "var(--skin-ink-soft)", margin: 0, lineHeight: 1.5 }}>
          Task-level assignment is still being designed — this tab is a preview of the layout only.
          Nothing here is saved yet.
        </p>
      </div>

      <div
        style={{
          border: "1px solid var(--skin-line)",
          borderRadius: "var(--skin-radius, 10px)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 1fr 1fr 0.8fr 0.8fr",
            gap: 0,
            padding: "8px 14px",
            background: "var(--skin-surface2)",
            borderBottom: collaborators?.length ? "1px solid var(--skin-line)" : "none",
            fontSize: 11,
            fontWeight: 600,
            color: "var(--skin-ink-faint)",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          <span>Member / Role</span>
          <span>Remuneration</span>
          <span>Value (Xcoins)</span>
          <span>Max hours</span>
          <span>Status</span>
        </div>
        {collaborators && collaborators.length > 0 ? (
          collaborators.map((c, i) => {
            const person = getPersonById(c.personId);
            if (!person) return null;
            return (
              <div
                key={c.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.4fr 1fr 1fr 0.8fr 0.8fr",
                  gap: 0,
                  alignItems: "center",
                  padding: "10px 14px",
                  fontSize: 13,
                  color: "var(--skin-ink)",
                  borderTop: i > 0 ? "1px solid var(--skin-line-soft, var(--skin-line))" : "none",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <Avatar className="h-6 w-6" style={{ flexShrink: 0 }}>
                    <AvatarFallback
                      className="text-[10px]"
                      style={{
                        background: avatarColor(person.displayName).bg,
                        color: avatarColor(person.displayName).fg,
                      }}
                    >
                      {initials(person.displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <span style={{ minWidth: 0 }}>
                    <span
                      style={{
                        display: "block",
                        fontWeight: 500,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {person.displayName}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--skin-ink-faint)" }}>{c.role}</span>
                  </span>
                </span>
                <span style={{ fontSize: 12, color: "var(--skin-ink-soft)" }}>
                  {c.remuneration}
                </span>
                <span style={{ fontSize: 12, color: "var(--skin-ink-soft)" }}>{c.valueXcoins}</span>
                <span style={{ fontSize: 12, color: "var(--skin-ink-soft)" }}>{c.maxHours}h</span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: STATUS_COLOR[c.status],
                  }}
                >
                  {STATUS_LABEL[c.status]}
                </span>
              </div>
            );
          })
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.4fr 1fr 1fr 0.8fr 0.8fr",
              gap: 0,
              padding: "12px 14px",
              fontSize: 13,
              color: "var(--skin-ink-faint)",
              fontStyle: "italic",
            }}
          >
            <span>No collaborators yet</span>
            <span>—</span>
            <span>—</span>
            <span>—</span>
            <span>—</span>
          </div>
        )}
      </div>

      <button
        type="button"
        disabled
        className="x-btn-secondary"
        style={{ alignSelf: "flex-start", opacity: 0.5, cursor: "not-allowed" }}
        title="This feature is not activated in the demo. Contact admin@xchange.eco."
      >
        + Invite a collaborator
      </button>
    </div>
  );
}
