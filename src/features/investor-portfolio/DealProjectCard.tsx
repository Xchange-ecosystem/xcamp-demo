import type { Project, PortfolioDeal } from "@/fixtures";
import { formatEUR, RISK_LABELS, ROUND_LABELS } from "./dealHelpers";

interface DealProjectCardProps {
  project: Project;
  deal: PortfolioDeal;
  onClick: () => void;
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <span
        style={{
          fontSize: 9.5,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          color: "var(--skin-ink-faint)",
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--skin-ink)" }}>{value}</span>
    </div>
  );
}

export function DealProjectCard({ project, deal, onClick }: DealProjectCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        all: "unset",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: 14,
        borderRadius: "var(--xr-lg, 10px)",
        border: "1px solid var(--skin-line)",
        background: "var(--skin-surface)",
        boxShadow: "var(--shadow-card)",
        transition: "border-color 0.15s, transform 0.15s",
        width: "100%",
        textAlign: "left",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--skin-accent)")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--skin-line)")}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          aria-hidden
          style={{
            width: 10,
            height: 10,
            flexShrink: 0,
            borderRadius: "50%",
            background: project.color,
          }}
        />
        <span
          style={{
            fontSize: 14.5,
            fontWeight: 600,
            color: "var(--skin-ink)",
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {project.name}
        </span>
        <span
          className="num"
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "var(--skin-accent)",
            flexShrink: 0,
          }}
        >
          {deal.matchPct}%
        </span>
      </div>

      <p
        style={{
          margin: 0,
          fontSize: 12,
          color: "var(--skin-ink-soft)",
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          lineHeight: 1.4,
        }}
      >
        {project.description}
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 8,
          paddingTop: 8,
          borderTop: "1px solid var(--skin-line-soft)",
        }}
      >
        <StatChip label="Round" value={ROUND_LABELS[deal.round]} />
        <StatChip label="Ask" value={formatEUR(deal.askAmount)} />
        <StatChip label="Ticket" value={formatEUR(deal.ticketSize)} />
        <StatChip label="Risk" value={RISK_LABELS[deal.riskLevel]} />
        <StatChip
          label="Club deal"
          value={deal.clubDealInvestors === 0 ? "None" : `${deal.clubDealInvestors} co-investors`}
        />
        {deal.label && (
          <StatChip
            label="Status"
            value={deal.label.charAt(0).toUpperCase() + deal.label.slice(1)}
          />
        )}
      </div>
    </button>
  );
}
