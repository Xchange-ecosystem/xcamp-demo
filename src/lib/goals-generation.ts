// "My Goals" feed AI generation — reuses the vox `/api/answer-with-context` call
// already proven at handleProjectSelect / dispatchProjectWelcome (src/routes/home.tsx),
// rather than building a new AI-calling path. See docs/phase-0-my-goals-feed-2026-08-25.md
// (§1) for why this call was chosen over Backcaster/Organiser/Journal's analyse().
import { voxFetch } from "@/integrations/vox/client";
import type {
  AnswerWithContextRequest,
  AnswerWithContextResponse,
  Altitude,
  AIPersona,
} from "@xchange/client";

export interface GeneratedItem {
  title: string;
  description: string;
}

export interface GeneratedGoal {
  objective: GeneratedItem;
  tasks: GeneratedItem[];
}

export interface GoalGenerationContext {
  projectId: string;
  projectTitle: string;
  projectDescription?: string | null;
  tenantId: string;
  altitude: Altitude;
  persona?: AIPersona;
  existingObjectiveTitles: string[];
  existingTaskTitles: string[];
}

async function callVox(
  req: AnswerWithContextRequest & { referenced_entity_ids?: string[] },
): Promise<AnswerWithContextResponse> {
  const res = await voxFetch("/api/answer-with-context", {
    method: "POST",
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`[Vox] /answer-with-context → ${res.status}`);
  return res.json() as Promise<AnswerWithContextResponse>;
}

function cardsToItems(cards: AnswerWithContextResponse["cards"]): GeneratedItem[] {
  return (cards ?? [])
    .map((c) => ({ title: (c.title ?? "").trim(), description: (c.body ?? "").trim() }))
    .filter((c): c is GeneratedItem => c.title.length > 0);
}

function contextLines(ctx: GoalGenerationContext): (string | null)[] {
  return [
    ctx.projectDescription ? `Project description: ${ctx.projectDescription}` : null,
    ctx.existingObjectiveTitles.length
      ? `Existing objectives in this project (do not duplicate): ${ctx.existingObjectiveTitles.join("; ")}`
      : null,
    ctx.existingTaskTitles.length
      ? `Existing tasks in this project (do not duplicate): ${ctx.existingTaskTitles.join("; ")}`
      : null,
  ];
}

/** Generates exactly 1 new objective + up to 3 new tasks from a free-text goal. */
export async function generateGoal(
  ctx: GoalGenerationContext,
  goalInput: string,
): Promise<GeneratedGoal> {
  const message = [
    `Generate exactly one new objective and exactly 3 new tasks that accomplish it, for the project "${ctx.projectTitle}".`,
    ...contextLines(ctx),
    `The user's goal: ${goalInput}`,
    `Respond as exactly 4 action cards: the first card is the new objective (concrete, achievable — title as the objective name, body as a short description), the next 3 cards are concrete tasks toward it (title as the task name, body as a short description).`,
  ]
    .filter((l): l is string => !!l)
    .join("\n");

  const res = await callVox({
    message,
    project_id: ctx.projectId,
    objective_id: "",
    tenant_id: ctx.tenantId,
    altitude: ctx.altitude,
    aiPersona: ctx.persona,
    context_scope: "project",
  });

  const items = cardsToItems(res.cards);
  if (items.length === 0) {
    throw new Error("Chi didn't return any suggestions — try rephrasing your goal.");
  }
  const [objective, ...tasks] = items;
  return { objective, tasks: tasks.slice(0, 3) };
}

/** Appends more tasks to an already-generated (possibly still-pending) objective. */
export async function generateMoreTasks(
  ctx: GoalGenerationContext,
  objective: GeneratedItem,
  alreadySuggestedTaskTitles: string[],
): Promise<GeneratedItem[]> {
  const message = [
    `Generate up to 3 more concrete tasks for the objective "${objective.title}" in project "${ctx.projectTitle}".`,
    objective.description ? `Objective description: ${objective.description}` : null,
    ...contextLines(ctx),
    alreadySuggestedTaskTitles.length
      ? `Tasks already suggested for this objective — do not repeat or rephrase these: ${alreadySuggestedTaskTitles.join("; ")}`
      : null,
    `Respond as action cards, one per new task (title as the task name, body as a short description).`,
  ]
    .filter((l): l is string => !!l)
    .join("\n");

  const res = await callVox({
    message,
    project_id: ctx.projectId,
    objective_id: "",
    tenant_id: ctx.tenantId,
    altitude: ctx.altitude,
    aiPersona: ctx.persona,
    context_scope: "project",
  });

  return cardsToItems(res.cards).slice(0, 3);
}
