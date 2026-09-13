// api/companion/chat.ts
//
// Vercel serverless function. Runs server-side only — same pattern as
// api/recap/extract.ts (this repo's only other real LLM call): the
// ANTHROPIC_API_KEY lives here, never in a VITE_* var or client code.
//
// This is the one real AI call in the demo. The Companion altitude's chat
// composer (CompanionAltitudeShell.tsx) POSTs the user's message, a persona
// tag, and a snapshot of that persona's own fixture data (see
// src/components/demo/companion/buildCompanionContext.ts) here, so the
// model's replies can plausibly reference the demo's own content — a
// founder's named collaborators and project objectives, an investor's
// portfolio standing or deal terms, a collaborator's assignments and
// wallet. Web search is enabled so the model can also ground replies in
// real-world information ("Kenya Power", industry context, etc.) — that's
// the "internet access" requirement for this feature.
//
// Nothing downstream of this call (the deterministic chat side-effects in
// deriveChatSideEffects.ts, Founder-only) invokes a model — this is the
// only one.

import type { VercelRequest, VercelResponse } from "@vercel/node";

type Persona = "founder" | "investor" | "collaborator";

interface ChatContextProject {
  name: string;
  description: string;
  tags: string[];
}

interface ChatContextObjective {
  title: string;
  description: string | null;
  status: string;
  dimension: string;
}

interface ChatContextTask {
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
}

interface ChatContextPerson {
  displayName: string;
  role: string;
  title: string;
}

interface ChatContextPortfolioProject {
  name: string;
  description?: string;
  rank?: number;
  performanceScore?: number;
  performanceDeltaPct?: number;
  investedAmount?: number;
  currentValuation?: number;
  matchPct?: number;
  riskLevel?: number;
  round?: string;
  askAmount?: number;
  ticketSize?: number;
}

interface ChatContextEcosystemMetrics {
  avgProgressPct: number;
  avgQualityPct: number;
  totalTasksCompleted: number;
  activeProjects: number;
}

interface ChatContextAssignment {
  title: string;
  workflowState: string;
  valueState: string;
  value: number;
  dueLabel: string;
}

interface ChatRequestBody {
  message?: string;
  persona?: Persona;
  context?: {
    // Founder
    project?: ChatContextProject;
    objectives?: ChatContextObjective[];
    tasks?: ChatContextTask[];
    people?: ChatContextPerson[];
    // Investor
    activeProject?: ChatContextPortfolioProject | null;
    topProjects?: ChatContextPortfolioProject[];
    ecosystemMetrics?: ChatContextEcosystemMetrics;
    // Collaborator
    assignments?: ChatContextAssignment[];
    walletBalance?: number;
  };
}

function buildFounderPrompt(context: ChatRequestBody["context"]): string[] {
  const project = context?.project;
  const objectives = context?.objectives ?? [];
  const tasks = context?.tasks ?? [];
  const people = context?.people ?? [];

  return [
    "You are Chi, an AI companion helping a startup founder run their project inside Xcamp.",
    "Speak directly to the founder, in a warm, concise, senior-operator tone coaching them on their own venture. A few sentences per reply, not an essay.",
    "",
    project
      ? `The founder's project: "${project.name}" — ${project.description} (tags: ${project.tags.join(", ")}).`
      : "",
    objectives.length
      ? `Current objectives:\n${objectives.map((o) => `- [${o.status}] ${o.title}${o.description ? `: ${o.description}` : ""}`).join("\n")}`
      : "",
    tasks.length
      ? `Open tasks:\n${tasks.map((t) => `- [${t.status}, ${t.priority} priority] ${t.title}${t.dueDate ? ` (due ${t.dueDate})` : ""}`).join("\n")}`
      : "",
    people.length
      ? `People around this project:\n${people.map((p) => `- ${p.displayName}, ${p.title} (${p.role})`).join("\n")}`
      : "",
    "",
    "Reference this data naturally where relevant — named people, the project's own objectives/tasks — rather than speaking in generalities.",
  ];
}

function describePortfolioProject(p: ChatContextPortfolioProject): string {
  const parts = [p.name];
  if (p.rank !== undefined) parts.push(`rank #${p.rank}`);
  if (p.performanceScore !== undefined)
    parts.push(
      `score ${p.performanceScore}${p.performanceDeltaPct !== undefined ? ` (${p.performanceDeltaPct >= 0 ? "+" : ""}${p.performanceDeltaPct} vs. last week)` : ""}`,
    );
  if (p.investedAmount !== undefined) parts.push(`invested €${p.investedAmount.toLocaleString()}`);
  if (p.currentValuation !== undefined)
    parts.push(`valuation €${p.currentValuation.toLocaleString()}`);
  if (p.matchPct !== undefined) parts.push(`${p.matchPct}% mandate match`);
  if (p.riskLevel !== undefined) parts.push(`risk ${p.riskLevel}/5`);
  if (p.round) parts.push(`${p.round} round`);
  if (p.askAmount !== undefined) parts.push(`asking €${p.askAmount.toLocaleString()}`);
  if (p.ticketSize !== undefined) parts.push(`your ticket €${p.ticketSize.toLocaleString()}`);
  return parts.join(", ");
}

function buildInvestorPrompt(context: ChatRequestBody["context"]): string[] {
  const activeProject = context?.activeProject;
  const topProjects = context?.topProjects ?? [];
  const metrics = context?.ecosystemMetrics;

  return [
    "You are Chi, an AI companion helping an investor evaluate dealflow and manage their portfolio inside Xcamp.",
    "Speak directly to the investor, in a sharp, concise, buy-side analyst tone. A few sentences per reply, not an essay.",
    "",
    activeProject
      ? `The investor is currently looking at one project: ${describePortfolioProject(activeProject)}.`
      : "",
    !activeProject && topProjects.length
      ? `Top of the investor's ranked portfolio:\n${topProjects.map((p) => `- ${describePortfolioProject(p)}`).join("\n")}`
      : "",
    !activeProject && metrics
      ? `Ecosystem: ${metrics.activeProjects} active projects, ${metrics.avgProgressPct}% avg. progress, ${metrics.avgQualityPct}% avg. quality, ${metrics.totalTasksCompleted} tasks completed.`
      : "",
    "",
    "Reference this data naturally where relevant — the project or portfolio names, their actual numbers — rather than speaking in generalities.",
  ];
}

function buildCollaboratorPrompt(context: ChatRequestBody["context"]): string[] {
  const assignments = context?.assignments ?? [];
  const walletBalance = context?.walletBalance;

  return [
    "You are Chi, an AI companion helping a collaborator track their assignments and earnings inside Xcamp.",
    "Speak directly to the collaborator, in a warm, concise, supportive tone helping them prioritize their work. A few sentences per reply, not an essay.",
    "",
    assignments.length
      ? `Their assignments:\n${assignments.map((a) => `- [${a.workflowState}, ${a.valueState}] ${a.title} — ${a.value} cr, ${a.dueLabel}`).join("\n")}`
      : "",
    walletBalance !== undefined
      ? `Current wallet balance: ${walletBalance} cr (settled value).`
      : "",
    "",
    "Reference this data naturally where relevant — their actual assignments and balance — rather than speaking in generalities.",
  ];
}

function buildSystemPrompt(persona: Persona, context: ChatRequestBody["context"]): string {
  const personaLines =
    persona === "investor"
      ? buildInvestorPrompt(context)
      : persona === "collaborator"
        ? buildCollaboratorPrompt(context)
        : buildFounderPrompt(context);

  return [
    ...personaLines,
    "You have web search available — use it when a reply would benefit from real-world grounding (market context, a named partner or customer, industry news), and say what you found plainly.",
  ]
    .filter(Boolean)
    .join("\n");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { message, context, persona: rawPersona } = (req.body ?? {}) as ChatRequestBody;
  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return res.status(400).json({ error: "message is required" });
  }
  const persona: Persona =
    rawPersona === "investor" || rawPersona === "collaborator" ? rawPersona : "founder";

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: buildSystemPrompt(persona, context),
        messages: [{ role: "user", content: message }],
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }],
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      return res.status(502).json({ error: "LLM request failed", detail });
    }

    const data = await response.json();
    const blocks: Array<{ type: string; text?: string }> = data.content ?? [];
    const reply = blocks
      .filter((b) => b.type === "text" && b.text)
      .map((b) => b.text)
      .join("\n\n")
      .trim();
    const usedWebSearch = blocks.some(
      (b) => b.type === "server_tool_use" || b.type === "web_search_tool_result",
    );

    if (!reply) {
      return res.status(502).json({ error: "No text reply returned by the model" });
    }

    return res.status(200).json({ reply, usedWebSearch });
  } catch (err) {
    return res.status(500).json({ error: "Chat request failed", detail: String(err) });
  }
}
