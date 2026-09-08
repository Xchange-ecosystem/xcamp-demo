// P1.3 Part 1 — assignment feed. Configures CardFeed<T> fresh for the
// Collaborator use case rather than extracting NavigatorBrowser.tsx — see
// the Phase 0 note in CollaboratorScreen.tsx for why.
import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ClipboardCheck,
  FileSignature,
  Hourglass,
  type LucideIcon,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CardFeed } from "@/components/card-feed/CardFeed";
import type { CardFeedConfig } from "@/components/card-feed/types";
import {
  getAssignmentObjectiveTitle,
  type Assignment,
  type AssignmentWorkflowState,
} from "@/fixtures/assignments";
import { getPersonById } from "@/fixtures/people";
import { getProjectById } from "@/fixtures/projects";

// Value vocabulary rule (P1.3 brief): value that isn't yet locked is
// "informational" and part of a sketch; locked value reads as "committed
// under agreement"; settled value reads as "settled". Never
// approved/confirmed/pending as a value-state word.
const VALUE_LABEL: Record<Assignment["valueState"], string> = {
  informational: "informational",
  committed: "committed under agreement",
  settled: "settled",
};

const WORKFLOW_META: Record<
  AssignmentWorkflowState,
  { label: string; icon: LucideIcon; accent: string }
> = {
  "awaiting-acceptance": {
    label: "Terms offered",
    icon: FileSignature,
    accent: "var(--skin-accent)",
  },
  "needs-proof": { label: "Needs proof", icon: Upload, accent: "var(--skin-accent)" },
  delivered: { label: "Delivered", icon: Hourglass, accent: "var(--skin-ink-soft)" },
  "in-progress": { label: "In progress", icon: ClipboardCheck, accent: "var(--skin-ink-soft)" },
  settled: { label: "Settled", icon: CheckCircle2, accent: "var(--skin-good)" },
};

const FILTERS: { id: AssignmentWorkflowState | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "awaiting-acceptance", label: "Needs my acceptance" },
  { id: "needs-proof", label: "Needs proof" },
  { id: "delivered", label: "Awaiting certification" },
  { id: "in-progress", label: "In progress" },
  { id: "settled", label: "Settled" },
];

export function AssignmentFeed({
  assignments,
  onChange,
}: {
  assignments: Assignment[];
  onChange: (next: Assignment[]) => void;
}) {
  const [filter, setFilter] = useState<AssignmentWorkflowState | "all">("all");
  const [reviewing, setReviewing] = useState<Assignment | null>(null);

  const visible = useMemo(
    () => (filter === "all" ? assignments : assignments.filter((a) => a.workflowState === filter)),
    [assignments, filter],
  );

  const updateAssignment = (id: string, patch: Partial<Assignment>) => {
    onChange(assignments.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  };

  const acceptTerms = (a: Assignment) => {
    updateAssignment(a.id, {
      workflowState: "in-progress",
      valueState: "committed",
      body: "I accepted binding terms. Value is locked until the objective completes.",
    });
    setReviewing(null);
    toast.success(`Terms accepted · ${a.value} cr committed under agreement`);
  };

  const declineTerms = (a: Assignment) => {
    onChange(assignments.filter((assignment) => assignment.id !== a.id));
    setReviewing(null);
    toast("Terms declined", { description: "The owner has been notified." });
  };

  const addProof = (a: Assignment) => {
    updateAssignment(a.id, {
      workflowState: "delivered",
      dueLabel: "awaiting certification",
      body:
        a.valueState === "committed"
          ? "Proof filed and delivered. Waiting on certification before this value releases."
          : "Proof filed. This objective is still a sketch, so the value stays informational until it's formalized.",
    });
    toast.success("Proof filed · delivered");
  };

  const config: CardFeedConfig<Assignment> = {
    getId: (a) => a.id,
    getTitle: (a) => a.title,
    getDescription: (a) => a.body,
    getVisual: (a) => ({
      icon: WORKFLOW_META[a.workflowState].icon,
      badgeLabel: WORKFLOW_META[a.workflowState].label,
      accent: WORKFLOW_META[a.workflowState].accent,
    }),
    getMeta: (a) => {
      const project = getProjectById(a.projectId);
      const owner = getPersonById(a.ownerId);
      return [
        {
          key: "project",
          label: project?.name ?? a.projectId,
          dotColor: project?.color,
        },
        { key: "objective", label: getAssignmentObjectiveTitle(a) },
        ...(owner ? [{ key: "owner", label: owner.displayName }] : []),
        { key: "due", label: a.dueLabel },
        { key: "value", label: `${a.value} cr · ${VALUE_LABEL[a.valueState]}` },
      ];
    },
    getActions: (a) => {
      if (a.workflowState === "awaiting-acceptance") {
        return [
          { key: "review", label: "Review terms", variant: "default", onClick: setReviewing },
          { key: "decline", label: "Decline", variant: "ghost", onClick: declineTerms },
        ];
      }
      if (a.workflowState === "needs-proof") {
        return [{ key: "proof", label: "Add proof", variant: "default", onClick: addProof }];
      }
      return [];
    },
    emptyMessage: "Nothing here right now.",
  };

  return (
    <section className="min-w-0 flex-1">
      <ToggleGroup
        type="single"
        value={filter}
        onValueChange={(v) => v && setFilter(v as AssignmentWorkflowState | "all")}
        className="mb-4 flex-wrap justify-start gap-1.5"
      >
        {FILTERS.map((f) => {
          const count =
            f.id === "all"
              ? assignments.length
              : assignments.filter((a) => a.workflowState === f.id).length;
          return (
            <ToggleGroupItem
              key={f.id}
              value={f.id}
              className="rounded-full border px-3 py-1.5 text-xs data-[state=on]:font-semibold"
              style={{ borderColor: "var(--skin-line)" }}
            >
              {f.label} <span className="ml-1 text-muted-foreground">{count}</span>
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>

      <CardFeed items={visible} config={config} />

      <Dialog open={!!reviewing} onOpenChange={(open) => !open && setReviewing(null)}>
        {reviewing && (
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Binding terms offered</DialogTitle>
              <DialogDescription>
                {getProjectById(reviewing.projectId)?.name} ·{" "}
                {getAssignmentObjectiveTitle(reviewing)}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col divide-y" style={{ borderColor: "var(--skin-line)" }}>
              <div className="flex items-center gap-3 py-2.5">
                <span className="w-24 shrink-0 text-xs text-muted-foreground">Task</span>
                <span className="text-sm font-medium">{reviewing.title}</span>
              </div>
              {reviewing.contract && (
                <>
                  <div className="flex items-center gap-3 py-2.5">
                    <span className="w-24 shrink-0 text-xs text-muted-foreground">My role</span>
                    <span className="text-sm font-medium">{reviewing.contract.role}</span>
                  </div>
                  <div className="flex items-center gap-3 py-2.5">
                    <span className="w-24 shrink-0 text-xs text-muted-foreground">My share</span>
                    <span className="text-sm font-medium">{reviewing.contract.share}</span>
                  </div>
                  <div className="flex items-center gap-3 py-2.5">
                    <span className="w-24 shrink-0 text-xs text-muted-foreground">Contract</span>
                    <span className="text-sm font-medium">{reviewing.contract.terms}</span>
                  </div>
                </>
              )}
              <div className="flex items-center gap-3 py-2.5">
                <span className="w-24 shrink-0 text-xs text-muted-foreground">Offered by</span>
                <span className="text-sm font-medium">
                  {getPersonById(reviewing.ownerId)?.displayName ?? "Unknown"}
                </span>
              </div>
            </div>

            <p
              className="rounded-md p-3 text-xs text-muted-foreground"
              style={{
                background:
                  "var(--skin-accent-soft, color-mix(in oklch, var(--skin-accent) 12%, transparent))",
              }}
            >
              Accepting counter-signs the agreement. My{" "}
              <span className="font-semibold text-foreground">{reviewing.value} cr</span> moves from
              informational to{" "}
              <span className="font-semibold text-foreground">committed under agreement</span> —
              locked, and released to my wallet when the objective completes and is certified. This
              can't be changed afterwards without both sides re-accepting.
            </p>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setReviewing(null)}>
                Not now
              </Button>
              <Button variant="outline" onClick={() => declineTerms(reviewing)}>
                Decline terms
              </Button>
              <Button onClick={() => acceptTerms(reviewing)}>Accept terms</Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </section>
  );
}
