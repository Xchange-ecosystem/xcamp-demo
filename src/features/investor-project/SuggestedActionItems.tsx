import { FlagTriangleRight, HandHelping, ShieldQuestion } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getInvestorSuggestionsByProject, type InvestorSuggestion } from "@/fixtures";

// Project Home's "suggested action items" (session brief revision §5 steps
// 6-7). The three response types are explicitly flagged in the brief as
// "not fully specified yet, just the three labels and their intent" — no
// mockup to build against, so this uses the same inert-toast confirmation
// pattern already established for other unwired CTAs in this persona (see
// DealDetailsSidepanel's "Go to project"-adjacent buttons). If Fabian wants
// a richer interaction (a form, a modal with a text field), this is the
// spot to swap it in — the fixture and card shell won't need to change.
const SUBJECT_COLOR: Record<InvestorSuggestion["subject"], string> = {
  Financial: "var(--skin-accent)",
  Team: "#8b5cf6",
  Market: "#f59e0b",
  Product: "#0ea5e9",
};

function respond(kind: "challenge" | "gap" | "assistance", suggestion: InvestorSuggestion) {
  if (kind === "challenge") {
    toast(`Challenge sent to the team: "${suggestion.title}"`);
  } else if (kind === "gap") {
    toast(`Flagged as a gap for the team to address.`);
  } else {
    toast(
      `Assistance offered on ${suggestion.subject.toLowerCase()} — the team has been notified.`,
    );
  }
}

function SuggestionCard({ suggestion }: { suggestion: InvestorSuggestion }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: 14,
        borderRadius: "var(--xr-lg, 10px)",
        border: "1px solid var(--skin-line)",
        background: "var(--skin-surface)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            padding: "2px 8px",
            borderRadius: 999,
            color: SUBJECT_COLOR[suggestion.subject],
            background: "var(--skin-accent-soft)",
          }}
        >
          {suggestion.subject}
        </span>
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--skin-ink)" }}>
          {suggestion.title}
        </div>
        <p
          style={{
            margin: "4px 0 0",
            fontSize: 12.5,
            color: "var(--skin-ink-soft)",
            lineHeight: 1.5,
          }}
        >
          {suggestion.description}
        </p>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
        <Button variant="outline" size="sm" onClick={() => respond("challenge", suggestion)}>
          <ShieldQuestion size={14} />
          Challenge data
        </Button>
        <Button variant="outline" size="sm" onClick={() => respond("gap", suggestion)}>
          <FlagTriangleRight size={14} />
          Indicate gap
        </Button>
        <Button variant="outline" size="sm" onClick={() => respond("assistance", suggestion)}>
          <HandHelping size={14} />
          Suggest assistance
        </Button>
      </div>
    </div>
  );
}

export function SuggestedActionItems({ projectId }: { projectId: string }) {
  const suggestions = getInvestorSuggestionsByProject(projectId);

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "var(--skin-ink)" }}>
          Suggested action items
        </h2>
        <span style={{ color: "var(--skin-ink-faint)", fontSize: 13 }}>
          {suggestions.length === 1 ? "1 item" : `${suggestions.length} items`}
        </span>
      </div>
      {suggestions.length === 0 ? (
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
          No suggested action items for this project yet.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {suggestions.map((s) => (
            <SuggestionCard key={s.id} suggestion={s} />
          ))}
        </div>
      )}
    </div>
  );
}
