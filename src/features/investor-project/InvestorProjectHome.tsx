import { CardFeed } from "@/components/card-feed/CardFeed";
import { investorUpdateConfig } from "@/components/card-feed/configs";
import { getFeedByKind, getObjectivesByProject, getProjectById } from "@/fixtures";

// Investor-flavored variant of Founder Home (session brief §4) — same
// "activity feed" shape as the Founder screen's action-item CardFeed, but
// without its Composer (mode pills + mock LLM processing): a founder
// composes updates about their own project, an investor only reads them.
// Feeds the same investorUpdateConfig Founder Dashboard already reuses for
// this exact "investor-facing" framing, scoped to one project instead of
// the whole ecosystem.
const AGREEMENT_LABEL: Record<string, string> = {
  done: "Complete",
  in_progress: "Under agreement",
  open: "Still a sketch",
  suggested: "Still a sketch",
};
const LABEL_ORDER = ["Complete", "Under agreement", "Still a sketch"] as const;
const LABEL_COLOR: Record<string, string> = {
  Complete: "var(--skin-good)",
  "Under agreement": "var(--skin-accent)",
  "Still a sketch": "var(--skin-line)",
};

export function InvestorProjectHome({ projectId }: { projectId: string }) {
  const project = getProjectById(projectId);
  if (!project) return null;

  const objectives = getObjectivesByProject(projectId);
  const counts = LABEL_ORDER.map((label) => ({
    label,
    count: objectives.filter((o) => AGREEMENT_LABEL[o.status] === label).length,
  })).filter((c) => c.count > 0);

  const updates = getFeedByKind("project_update").filter((item) => item.projectId === projectId);

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "28px 32px 48px" }}>
      <div
        style={{
          height: 64,
          borderRadius: "var(--xr-lg, 10px)",
          background: project.color,
          marginBottom: 18,
        }}
      />
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "var(--skin-ink)" }}>
        {project.name}
      </h1>
      <p style={{ margin: "4px 0 14px", fontSize: 14, color: "var(--skin-ink-soft)" }}>
        {project.description}
      </p>
      {project.tags.length > 0 && (
        <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
          {project.tags.map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: 11,
                padding: "2px 9px",
                borderRadius: 999,
                background: "var(--skin-accent-soft)",
                color: "var(--skin-ink-soft)",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {counts.length > 0 && (
        <div style={{ marginBottom: 28, maxWidth: 420 }}>
          <div
            style={{
              display: "flex",
              height: 8,
              gap: 2,
              borderRadius: 999,
              overflow: "hidden",
              marginBottom: 8,
            }}
          >
            {counts.map((c) => (
              <span key={c.label} style={{ flex: c.count, background: LABEL_COLOR[c.label] }} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {counts.map((c) => (
              <span
                key={c.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  color: "var(--skin-ink-soft)",
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: LABEL_COLOR[c.label],
                  }}
                />
                {c.label} <b style={{ color: "var(--skin-ink)" }}>{c.count}</b>
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "var(--skin-ink)" }}>
          Updates from the team
        </h2>
        <span style={{ color: "var(--skin-ink-faint)", fontSize: 13 }}>
          {updates.length === 1 ? "1 update" : `${updates.length} updates`}
        </span>
      </div>
      {updates.length === 0 ? (
        <div
          style={{
            padding: "28px 16px",
            textAlign: "center",
            color: "var(--skin-ink-faint)",
            fontSize: 13,
            border: "1px dashed var(--skin-line)",
            borderRadius: "var(--xr-lg, 10px)",
          }}
        >
          No updates posted for this project yet.
        </div>
      ) : (
        <CardFeed items={updates} config={investorUpdateConfig} />
      )}
    </div>
  );
}
