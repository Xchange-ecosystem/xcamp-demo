// Part 4 — the proposal modal. Triggered either by the composer's
// mock-processing flow (Part 4) or by a feed card's "Review" action
// (Part 2's getActions extension to CardFeedConfig).
//
// Wording note (P1.1 Phase 0, Part 4): the prompt asked to align copy with
// CFM-05's real agreement-lifecycle terms ("sketch → agreement → accept →
// complete"). That report isn't available in this repo and no such
// vocabulary exists anywhere in xcamp-companion — the mockup's wording was
// invented. What *is* real and already in the shared fixtures/schema is
// Task.status: "inactive" | "active" | "completed" (src/fixtures/types.ts,
// mirroring the production notes table). This modal's copy uses that
// instead of the mockup's invented "sketch"/"agreement" language.
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getPersonById } from "@/fixtures/people";

export interface Proposal {
  id: string;
  title: string;
  sourceLabel: string;
  assigneeId: string;
  time: string;
  value: number;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function ProposalModal({
  proposal,
  onOpenChange,
  onAccept,
  onDismiss,
}: {
  proposal: Proposal | null;
  onOpenChange: (open: boolean) => void;
  onAccept: (proposal: Proposal) => void;
  onDismiss: (proposal: Proposal) => void;
}) {
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [value, setValue] = useState("");

  useEffect(() => {
    if (!proposal) return;
    setTitle(proposal.title);
    setTime(proposal.time);
    setValue(String(proposal.value));
  }, [proposal]);

  if (!proposal) return null;
  const assignee = getPersonById(proposal.assigneeId);

  return (
    <Dialog open={!!proposal} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Chi proposes a task</DialogTitle>
          <DialogDescription>{proposal.sourceLabel}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col divide-y" style={{ borderColor: "var(--skin-line)" }}>
          <div className="flex items-center gap-3 py-2.5">
            <Label htmlFor="proposal-title" className="w-20 shrink-0 text-xs text-muted-foreground">
              Task
            </Label>
            <Input
              id="proposal-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1"
            />
          </div>

          <div className="flex items-center gap-3 py-2.5">
            <span className="w-20 shrink-0 text-xs text-muted-foreground">Assignee</span>
            <div className="flex flex-1 items-center gap-2 text-sm font-medium">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-[10px]">
                  {assignee ? initials(assignee.displayName) : "?"}
                </AvatarFallback>
              </Avatar>
              {assignee?.displayName ?? "Unassigned"}
              {assignee && <Badge variant="secondary">{assignee.title}</Badge>}
            </div>
          </div>

          <div className="flex items-center gap-3 py-2.5">
            <Label htmlFor="proposal-time" className="w-20 shrink-0 text-xs text-muted-foreground">
              Time
            </Label>
            <Input
              id="proposal-time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="flex-1"
            />
          </div>

          <div className="flex items-center gap-3 py-2.5">
            <Label htmlFor="proposal-value" className="w-20 shrink-0 text-xs text-muted-foreground">
              Value
            </Label>
            <Input
              id="proposal-value"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="flex-1"
            />
          </div>
        </div>

        <p
          className="rounded-md p-3 text-xs text-muted-foreground"
          style={{
            background:
              "var(--skin-accent-wash, color-mix(in oklch, var(--skin-accent) 12%, transparent))",
          }}
        >
          Accepting adds this as an <span className="font-semibold text-foreground">active</span>{" "}
          task assigned to {assignee?.displayName ?? "the assignee"}. It moves to{" "}
          <span className="font-semibold text-foreground">completed</span> once the work is
          delivered and proof is filed.
        </p>

        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" onClick={() => onDismiss(proposal)}>
            Dismiss
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => document.getElementById("proposal-title")?.focus()}
            >
              Keep editing
            </Button>
            <Button
              onClick={() =>
                onAccept({ ...proposal, title, time, value: Number(value) || proposal.value })
              }
            >
              Accept as active task
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
