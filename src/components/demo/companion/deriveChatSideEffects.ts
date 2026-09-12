// src/components/demo/companion/deriveChatSideEffects.ts
//
// Deterministic, non-AI side effects for the Founder Companion chat — sibling
// to generateStartCards.ts in spirit (pulls from real fixture pools rather
// than authoring new content), but mutates local demo state instead of
// generating copy. Called once per chat turn, after the user's message is
// sent — never after the model's reply, and never given the reply's text,
// so nothing here is influenced by what the model said.
//
// Trigger: simple keyword match on the user's message; if none hit, a
// turn-count fallback still picks one kind of effect (round-robin) so a
// short demo conversation reliably shows variety without needing every
// message to be crafted just right. Either way, exactly one effect fires per
// turn, applied to the next not-yet-touched item from the real fixture pool
// for DEMO_FOUNDER_PROJECT_ID — no new fixture rows, no generated text.
import { DEMO_FOUNDER_PROJECT_ID } from "@/fixtures/pitch";
import { getObjectivesByProject, TASKS } from "@/fixtures/objectives";
import { PEOPLE } from "@/fixtures/people";

export interface ChatSideEffects {
  advancedTaskIds: string[];
  advancedObjectiveIds: string[];
  invitedPersonIds: string[];
}

export const EMPTY_SIDE_EFFECTS: ChatSideEffects = {
  advancedTaskIds: [],
  advancedObjectiveIds: [],
  invitedPersonIds: [],
};

type EffectKind = "task" | "objective" | "invite";

const KEYWORDS: Record<EffectKind, string[]> = {
  task: ["task", "todo", "to-do", "finish", "ship", "deliver", "complete"],
  objective: ["objective", "agreement", "progress", "milestone", "goal", "pilot"],
  invite: ["invite", "collaborator", "hire", "team", "help", "support", "who"],
};

const FALLBACK_ORDER: EffectKind[] = ["task", "objective", "invite"];

function pickKind(message: string, turnIndex: number): EffectKind {
  const lower = message.toLowerCase();
  for (const kind of FALLBACK_ORDER) {
    if (KEYWORDS[kind].some((kw) => lower.includes(kw))) return kind;
  }
  return FALLBACK_ORDER[turnIndex % FALLBACK_ORDER.length];
}

// Advances one Objective's status one step forward: open/suggested ->
// in_progress -> done. Never revisits an id already in prev.advancedObjectiveIds.
function nextObjectiveId(prev: ChatSideEffects): string | null {
  const objective = getObjectivesByProject(DEMO_FOUNDER_PROJECT_ID).find(
    (o) => o.status !== "done" && !prev.advancedObjectiveIds.includes(o.id),
  );
  return objective?.id ?? null;
}

// Advances one Task from "active" to "completed". Never revisits an id
// already in prev.advancedTaskIds.
function nextTaskId(prev: ChatSideEffects): string | null {
  const task = TASKS.find(
    (t) =>
      t.projectId === DEMO_FOUNDER_PROJECT_ID &&
      t.status === "active" &&
      !prev.advancedTaskIds.includes(t.id),
  );
  return task?.id ?? null;
}

// Invites the next not-yet-invited collaborator, ecosystem-wide (same pool
// CompanionInfoPanel's People section already reads from).
function nextCollaboratorId(prev: ChatSideEffects): string | null {
  const person = PEOPLE.find(
    (p) => p.role === "collaborator" && !prev.invitedPersonIds.includes(p.id),
  );
  return person?.id ?? null;
}

/**
 * Given the user's latest message and how many turns have happened so far,
 * returns the next side-effects state. Returns `prev` unchanged (same
 * reference) if the chosen effect kind has nothing left to advance.
 */
export function deriveChatSideEffects(
  message: string,
  turnIndex: number,
  prev: ChatSideEffects,
): ChatSideEffects {
  const kind = pickKind(message, turnIndex);

  if (kind === "task") {
    const id = nextTaskId(prev);
    return id ? { ...prev, advancedTaskIds: [...prev.advancedTaskIds, id] } : prev;
  }
  if (kind === "objective") {
    const id = nextObjectiveId(prev);
    return id ? { ...prev, advancedObjectiveIds: [...prev.advancedObjectiveIds, id] } : prev;
  }
  const id = nextCollaboratorId(prev);
  return id ? { ...prev, invitedPersonIds: [...prev.invitedPersonIds, id] } : prev;
}
