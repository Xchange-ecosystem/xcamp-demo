// Shared placeholder for MicroApps that are named in a persona's nav but not
// built yet. Replaces ComingSoonPage for every /demo/* slot (see the B4
// session report): that component centres a 56px icon over a "coming soon"
// line, which reads as an empty state rather than as information. This one
// answers the three questions someone actually has when they land on an
// unbuilt tool — what it does, who it's for, what data it composes from —
// and states its status once, quietly, without a headline or a notify-me
// control.
//
// ComingSoonPage itself stays in the tree: /ecosystem-dashboard and /ai-plan
// are auth-gated main-app routes outside this brief's scope and still use it.
//
// Radius tokens here are the --xr family (card/control scale), matching
// PortfolioProjectCard — see the B4 Phase 0 report's token decision.

export interface MicroAppPlaceholderProps {
  /** Tool name, matching its nav label exactly. */
  title: string;
  /** What the tool does. One or two plain sentences, active voice. */
  what: string;
  /** Which persona it serves and the job it does for them. */
  who: string;
  /** Existing Xcamp data this composes from — rendered as pills. */
  drawsFrom: string[];
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "var(--skin-ink-faint)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: 7,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

export function MicroAppPlaceholder({ title, what, who, drawsFrom }: MicroAppPlaceholderProps) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
      <div style={{ maxWidth: 560 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 22 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 600,
              letterSpacing: "-0.01em",
              color: "var(--skin-ink)",
              fontFamily: "var(--skin-font-head)",
            }}
          >
            {title}
          </h1>
          <span
            style={{
              fontSize: 11.5,
              color: "var(--skin-ink-faint)",
              border: "1px solid var(--skin-line)",
              borderRadius: "var(--xr-pill, 999px)",
              padding: "1px 9px",
              whiteSpace: "nowrap",
            }}
          >
            Not live yet
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Section label="What this does">
            <p
              style={{
                margin: 0,
                fontSize: 14.5,
                lineHeight: 1.55,
                color: "var(--skin-ink)",
              }}
            >
              {what}
            </p>
          </Section>

          <Section label="Who it's for">
            <p
              style={{
                margin: 0,
                fontSize: 14,
                lineHeight: 1.55,
                color: "var(--skin-ink-soft)",
              }}
            >
              {who}
            </p>
          </Section>

          <Section label="What it draws from">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {drawsFrom.map((source) => (
                <span
                  key={source}
                  style={{
                    fontSize: 12,
                    padding: "3px 10px",
                    borderRadius: "var(--xr-pill, 999px)",
                    background: "var(--skin-surface2)",
                    color: "var(--skin-ink-soft)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {source}
                </span>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
