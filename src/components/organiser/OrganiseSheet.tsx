import { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import {
  propose,
  confirm,
  commit,
  type OrganiserProposal,
} from "@/lib/organiser-api";
import type { XcampUser } from "@/types/xcamp";

type Stage = "loading" | "empty" | "review" | "committing";

function badgeLabel(type: string): string {
  if (type === "new_objective") return "New Objective";
  if (type === "link_to_objective") return "Link to Objective";
  return type.replace(/_/g, " ");
}

export function OrganiseSheet({
  open,
  user,
  intent,
  onClose,
  onOrganised,
}: {
  open: boolean;
  user: XcampUser;
  intent: string;
  onClose: () => void;
  onOrganised?: () => void;
}) {
  const [stage, setStage] = useState<Stage>("loading");
  const [sessionId, setSessionId] = useState("");
  const [proposals, setProposals] = useState<OrganiserProposal[]>([]);
  const [approved, setApproved] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!open) return;
    let active = true;
    setStage("loading");
    setProposals([]);
    setApproved({});
    propose({ userId: user.centralId, tenantId: user.tenantId, intent })
      .then((res) => {
        if (!active) return;
        setSessionId(res.session_id);
        if (res.proposals.length === 0) {
          setStage("empty");
          return;
        }
        setProposals(res.proposals);
        setApproved(Object.fromEntries(res.proposals.map((p) => [p.proposal_id, true])));
        setStage("review");
      })
      .catch((e) => {
        if (!active) return;
        toast.error((e as Error).message || "Chi couldn't organise this note.");
        onClose();
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, intent]);

  const handleConfirm = async () => {
    setStage("committing");
    try {
      await confirm(
        sessionId,
        proposals.map((p) => ({ proposal_id: p.proposal_id, approved: !!approved[p.proposal_id] })),
      );
      const result = await commit(sessionId);
      const approvedCount = proposals.filter((p) => approved[p.proposal_id]).length;
      const n = result.succeeded || Math.max(approvedCount - result.failures.length, 0);

      if (n > 0) toast.success(`Organised into ${n} objective${n === 1 ? "" : "s"}`);
      if (result.failures.length > 0) {
        const titles = result.failures
          .map((f) => f.title || proposals.find((p) => p.proposal_id === f.proposal_id)?.payload.title)
          .filter(Boolean);
        toast.error(
          titles.length
            ? `Couldn't organise: ${titles.join(", ")}`
            : `${result.failures.length} item(s) failed to organise.`,
        );
      }
      onOrganised?.();
      onClose();
    } catch (e) {
      toast.error((e as Error).message || "Failed to organise this note.");
      setStage("review");
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles size={18} /> Organise with Chi
          </SheetTitle>
          <SheetDescription>
            Review where Chi suggests filing this note before anything is saved.
          </SheetDescription>
        </SheetHeader>

        {(stage === "loading") && (
          <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 size={16} className="animate-spin" /> Asking Chi…
          </div>
        )}

        {stage === "empty" && (
          <div className="py-8">
            <p className="text-sm text-muted-foreground">
              Chi couldn't find a clear home for this note — try adding more detail.
            </p>
            <div className="mt-6 flex justify-end">
              <button className="x-btn-secondary" onClick={onClose}>Close</button>
            </div>
          </div>
        )}

        {(stage === "review" || stage === "committing") && (
          <div className="py-4">
            <ul className="flex flex-col gap-2">
              {proposals.map((p) => {
                const on = !!approved[p.proposal_id];
                return (
                  <li
                    key={p.proposal_id}
                    className="flex items-center justify-between gap-3 rounded-lg border p-3"
                    style={{ borderColor: "var(--skin-line)" }}
                  >
                    <div className="min-w-0 flex-1">
                      <Badge variant="secondary" className="mb-1">{badgeLabel(p.proposal_type)}</Badge>
                      <div className="truncate text-sm font-medium" style={{ color: "var(--skin-ink)" }}>
                        {p.payload.title || "Untitled"}
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={on}
                      disabled={stage === "committing"}
                      onClick={() =>
                        setApproved((prev) => ({ ...prev, [p.proposal_id]: !prev[p.proposal_id] }))
                      }
                      style={{
                        flexShrink: 0,
                        width: 38,
                        height: 22,
                        borderRadius: 999,
                        border: "none",
                        cursor: stage === "committing" ? "default" : "pointer",
                        position: "relative",
                        background: on ? "var(--skin-accent)" : "var(--skin-line)",
                        transition: "background .15s",
                      }}
                      aria-label={`Toggle ${p.payload.title || "proposal"}`}
                    >
                      <span
                        style={{
                          position: "absolute", top: 2, left: on ? 18 : 2, width: 18, height: 18,
                          borderRadius: 999, background: "#fff", transition: "left .15s",
                        }}
                      />
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="mt-6 flex justify-end gap-2">
              <button className="x-btn-secondary" onClick={onClose} disabled={stage === "committing"}>
                Cancel
              </button>
              <button className="x-btn-primary" onClick={handleConfirm} disabled={stage === "committing"}>
                {stage === "committing" ? "Organising…" : "Confirm"}
              </button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
