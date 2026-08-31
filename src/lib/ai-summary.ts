// AI summaries for the task/objective sidepanels — reuses the existing Vox
// `/api/answer-with-context` call (the same "chi" AI path already proven by
// goals-generation.ts's generateGoal/generateMoreTasks and NoteEditor's
// auto-tag button) rather than introducing a second AI-calling path. No
// dedicated "contribution-summary" endpoint exists in this repo today
// (repo-wide grep for chi-orchestration/contribution-summary turns up
// nothing) — if xcamp-foundation exposes one, swapping this call site for
// it later is a one-file change.
import { voxFetch } from "@/integrations/vox/client";
import type {
  AnswerWithContextRequest,
  AnswerWithContextResponse,
  Altitude,
  AIPersona,
} from "@xchange/client";
import type { XcampUser } from "@/types/xcamp";

async function callVox(req: AnswerWithContextRequest): Promise<AnswerWithContextResponse> {
  const res = await voxFetch("/api/answer-with-context", {
    method: "POST",
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`[Vox] /answer-with-context → ${res.status}`);
  return res.json() as Promise<AnswerWithContextResponse>;
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

export interface TaskSummaryInput {
  taskId: string;
  taskTitle: string;
  /** "About this task and its deliverables" — the task's own body_html. */
  aboutBody: string;
  /** Do & Document's linked proof notes. */
  proofNotes: { title: string; body: string }[];
  altitude: Altitude;
  persona?: AIPersona;
}

/** Task sidepanel — combines the About body with all linked proof notes. */
export async function generateTaskSummary(
  user: XcampUser,
  input: TaskSummaryInput,
): Promise<string> {
  const aboutText = htmlToText(input.aboutBody);
  const proofText = input.proofNotes
    .map((p) => `- ${p.title}: ${truncate(htmlToText(p.body), 400)}`)
    .join("\n");

  const message = [
    `Write a concise 2-4 sentence summary of this task for a quick-glance side panel. Plain prose, no headings or bullet points in your reply.`,
    `Task: ${input.taskTitle}`,
    aboutText ? `About this task and its deliverables: ${truncate(aboutText, 1500)}` : null,
    proofText ? `Linked deliverables (proof notes):\n${proofText}` : `No deliverables logged yet.`,
  ]
    .filter((l): l is string => !!l)
    .join("\n\n");

  const res = await callVox({
    message,
    tenant_id: user.tenantId,
    altitude: input.altitude,
    aiPersona: input.persona,
    context_scope: "private",
    note_id: input.taskId,
  });
  return (res.reply_markdown || "").trim();
}

export interface ObjectiveSummaryInput {
  objectiveId: string;
  objectiveTitle: string;
  /** One entry per task under the objective — either the task's own combined
   * (About + proof notes) summary, or its raw text, per `mode`. */
  taskSummaries: { title: string; text: string }[];
  /** 'per-task' summarizes each task's already-generated summary (cheaper,
   * and per the brief likely more coherent at scale) vs 'raw' which
   * concatenates full About+Do&Document text. Defaulting to 'per-task' —
   * flagged for Fabian to confirm rather than silently assumed final. */
  mode: "per-task" | "raw";
  altitude: Altitude;
  persona?: AIPersona;
}

/** Objective sidepanel — aggregates across the objective's tasks. */
export async function generateObjectiveSummary(
  user: XcampUser,
  input: ObjectiveSummaryInput,
): Promise<string> {
  const lines = input.taskSummaries.map(
    (t) => `- ${t.title}: ${truncate(t.text, input.mode === "raw" ? 800 : 300)}`,
  );

  const message = [
    `Write a concise 3-5 sentence summary of progress and deliverables across this objective's tasks, for a quick-glance side panel. Plain prose, no headings or bullet points in your reply.`,
    `Objective: ${input.objectiveTitle}`,
    lines.length ? `Tasks:\n${lines.join("\n")}` : "No tasks yet.",
  ].join("\n\n");

  const res = await callVox({
    message,
    tenant_id: user.tenantId,
    objective_id: input.objectiveId,
    altitude: input.altitude,
    aiPersona: input.persona,
    context_scope: "private",
  });
  return (res.reply_markdown || "").trim();
}
