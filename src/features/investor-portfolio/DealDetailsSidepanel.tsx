import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import type { Project, PortfolioDeal } from "@/fixtures";
import { formatEUR, RISK_LABELS, ROUND_LABELS } from "./dealHelpers";
import { DealHeaderArt } from "./DealHeaderArt";

interface DealDetailsSidepanelProps {
  project: Project | null;
  deal: PortfolioDeal | null;
  ctaLabel: string;
  onOpenChange: (open: boolean) => void;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          color: "var(--skin-ink-faint)",
          marginBottom: 3,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 14, color: "var(--skin-ink)" }}>{value}</div>
    </div>
  );
}

// Clone of the functional app's ProjectStubPanel shape (cover/name/
// description + a persona-specific footer CTA) — "Go to project" is real
// (this session built /demo/investor/project/$projectId), the label-mutating
// CTAs stay inert-with-toast, same convention as ProjectStubPanel's own
// "Request details" button.
export function DealDetailsSidepanel({
  project,
  deal,
  ctaLabel,
  onOpenChange,
}: DealDetailsSidepanelProps) {
  const navigate = useNavigate();
  const open = !!project && !!deal;

  function handleCta() {
    if (!project) return;
    if (ctaLabel === "Go to project") {
      onOpenChange(false);
      void navigate({ to: "/demo/investor/project/$projectId", params: { projectId: project.id } });
      return;
    }
    toast(`${ctaLabel} isn't wired up yet.`);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        {project && deal && (
          <>
            <div style={{ margin: "-24px -24px 0" }}>
              <DealHeaderArt project={project} height={120} />
            </div>
            <SheetHeader>
              <SheetTitle>{project.name}</SheetTitle>
            </SheetHeader>

            <div style={{ display: "flex", flexDirection: "column", gap: 18, overflowY: "auto" }}>
              <p
                style={{
                  margin: 0,
                  fontSize: 13.5,
                  color: "var(--skin-ink-soft)",
                  lineHeight: 1.5,
                }}
              >
                {project.description}
              </p>

              {project.tags.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
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

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Field label="Match to your mandate" value={`${deal.matchPct}%`} />
                <Field label="Risk level" value={RISK_LABELS[deal.riskLevel]} />
                <Field label="Round" value={ROUND_LABELS[deal.round]} />
                <Field
                  label="Club deal"
                  value={
                    deal.clubDealInvestors === 0
                      ? "No co-investors yet"
                      : `${deal.clubDealInvestors} co-investors`
                  }
                />
                <Field label="Investment ask" value={formatEUR(deal.askAmount)} />
                <Field label="Suggested ticket" value={formatEUR(deal.ticketSize)} />
              </div>
            </div>

            <div style={{ marginTop: "auto", paddingTop: 16 }}>
              <Button className="w-full" onClick={handleCta}>
                {ctaLabel}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
