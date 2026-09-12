// src/components/demo/microapps/GoalsMicroApp.tsx
//
// Clone of the real, working Goals page (src/routes/project.$projectId_.goals.tsx
// -> src/components/goals/GoalsFeed.tsx) for the Founder Companion's Goals
// microapp (demo.founder.microapps.goals.tsx), replacing the generic
// ComingSoonPage placeholder there. Two adaptations from the real page,
// per instruction:
//
// 1. Restyled flat — the real page wraps content in PageHeroShell, which
//    renders a photographic hero background (useHeroImage) behind the
//    header. Dropped entirely; this renders as plain content inside
//    DemoShell's existing flat rounded surface card, matching the rest of
//    the Companion/Platform demo UI.
// 2. Backed by src/fixtures/objectives.ts (getObjectivesByProject /
//    getTasksByObjective for DEMO_FOUNDER_PROJECT_ID) — the same source
//    CompanionInfoPanel's Items tab already reads — instead of the real
//    page's Supabase-backed useObjectives()/useObjectiveTasks() hooks.
//
// "Create New Goal" on the real page calls a real AI generation endpoint
// (generateGoal(), src/lib/goals-generation.ts) then persists via Supabase
// on Accept. Neither is in scope here (no AI call anywhere in this repo
// except the Companion chat completion, no Supabase writes) — so this clone
// appends a plain local objective (status "open"/"Still a sketch") to
// component state instead: same interaction shape (type a goal, click
// Create, see it appear in the list), no AI, no persistence beyond the
// session, no new fixture rows authored.
import { useState } from "react";
import { Sparkles, Target } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { getObjectivesByProject, getTasksByObjective } from "@/fixtures/objectives";
import { DEMO_FOUNDER_PROJECT_ID } from "@/fixtures/pitch";
import { getProjectById } from "@/fixtures/projects";
import type { Objective } from "@/fixtures/types";

// Same agreement-lifecycle relabeling CompanionInfoPanel / founder/RightColumn
// use, kept in lockstep by convention (each of those three also defines it
// locally rather than sharing an import — matching that established pattern
// here rather than introducing a new shared module).
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

let localGoalCounter = 0;

export function GoalsMicroApp() {
  const project = getProjectById(DEMO_FOUNDER_PROJECT_ID);
  const [draft, setDraft] = useState("");
  const [localObjectives, setLocalObjectives] = useState<Objective[]>([]);

  const objectives = [...getObjectivesByProject(DEMO_FOUNDER_PROJECT_ID), ...localObjectives];

  const handleCreate = () => {
    const title = draft.trim();
    if (!title) return;
    localGoalCounter += 1;
    setLocalObjectives((prev) => [
      ...prev,
      {
        id: `local-goal-${localGoalCounter}`,
        projectId: DEMO_FOUNDER_PROJECT_ID,
        title,
        description: null,
        status: "open",
        sortOrder: 1000 + prev.length,
        dimension: "Product",
        startedAt: null,
        updatedAt: new Date().toISOString().slice(0, 10),
        completedAt: null,
        proofCount: 0,
        evaluationPct: null,
      },
    ]);
    setDraft("");
  };

  const counts = LABEL_ORDER.map((label) => ({
    label,
    count: objectives.filter((o) => AGREEMENT_LABEL[o.status] === label).length,
  })).filter((c) => c.count > 0);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">My Goals</h1>
        <p className="text-sm text-muted-foreground">{project?.name ?? "This project"}</p>
      </div>

      {counts.length > 0 && (
        <div>
          <div
            style={{
              display: "flex",
              height: 8,
              gap: 2,
              overflow: "hidden",
              borderRadius: 999,
              marginBottom: 8,
            }}
          >
            {counts.map((c) => (
              <span key={c.label} style={{ flex: c.count, background: LABEL_COLOR[c.label] }} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {counts.map((c) => (
              <div
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
                  style={{
                    height: 8,
                    width: 8,
                    borderRadius: 2,
                    background: LABEL_COLOR[c.label],
                  }}
                />
                {c.label} <b style={{ color: "var(--skin-ink)" }}>{c.count}</b>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        <textarea
          className="x-input"
          rows={3}
          placeholder='Create a new goal… e.g. "Launch our beta waitlist"'
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button
          type="button"
          className="x-btn-primary"
          style={{ alignSelf: "flex-start" }}
          disabled={!draft.trim()}
          onClick={handleCreate}
        >
          <Sparkles size={14} /> Create New Goal
        </button>
      </div>

      <div>
        <h2 className="mb-1 text-sm font-semibold text-muted-foreground">Objectives</h2>
        <Accordion type="multiple">
          {objectives.map((objective) => {
            const tasks = getTasksByObjective(objective.id);
            const completed = tasks.filter((t) => t.status === "completed").length;
            return (
              <AccordionItem key={objective.id} value={objective.id}>
                <AccordionTrigger>
                  <span style={{ display: "flex", flex: 1, alignItems: "center", gap: 8 }}>
                    <Target size={14} style={{ color: "var(--skin-accent)", flexShrink: 0 }} />
                    <span style={{ fontWeight: 600, color: "var(--skin-ink)" }}>
                      {objective.title}
                    </span>
                    <span
                      style={{
                        marginLeft: "auto",
                        marginRight: 8,
                        fontSize: 11,
                        color: "var(--skin-ink-faint)",
                      }}
                    >
                      {completed}/{tasks.length}
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  {tasks.length === 0 ? (
                    <p style={{ fontSize: 13, color: "var(--skin-ink-faint)", margin: 0 }}>
                      No tasks under this goal yet.
                    </p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {tasks.map((task) => (
                        <label
                          key={task.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            fontSize: 13,
                            color: "var(--skin-ink-soft)",
                          }}
                        >
                          <input type="checkbox" checked={task.status === "completed"} readOnly />
                          <span
                            style={{
                              textDecoration: task.status === "completed" ? "line-through" : "none",
                            }}
                          >
                            {task.title}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    </div>
  );
}
