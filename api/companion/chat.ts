// api/companion/chat.ts
//
// Vercel serverless function. Runs server-side only — same pattern as
// api/recap/extract.ts (this repo's only other real LLM call): the
// ANTHROPIC_API_KEY lives here, never in a VITE_* var or client code.
//
// This is the one real AI call in the Founder Companion showcase. The
// Companion altitude's chat composer (CompanionAltitudeShell.tsx) POSTs the
// user's message plus a snapshot of the demo's own fixture data here, so the
// model's replies can plausibly reference the demo's own content (named
// collaborators, the Solari Energy project, its objectives/tasks). Web
// search is enabled so the model can also ground replies in real-world
// information ("Kenya Power", industry context, etc.) — that's the
// "internet access" requirement for this feature.
//
// Nothing downstream of this call (the deterministic chat side-effects in
// deriveChatSideEffects.ts) invokes a model — this is the only one.

import type { VercelRequest, VercelResponse } from "@vercel/node";

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

interface ChatRequestBody {
  message?: string;
  context?: {
    project?: ChatContextProject;
    objectives?: ChatContextObjective[];
    tasks?: ChatContextTask[];
    people?: ChatContextPerson[];
  };
}

function buildSystemPrompt(context: ChatRequestBody["context"]): string {
  const project = context?.project;
  const objectives = context?.objectives ?? [];
  const tasks = context?.tasks ?? [];
  const people = context?.people ?? [];

  return [
    "You are Chi, an AI companion helping a startup founder run their project inside Xcamp.",
    "Speak directly to the founder, in a warm, concise, senior-operator tone. A few sentences per reply, not an essay.",
    "You have web search available — use it when a reply would benefit from real-world grounding (market context, a named partner or customer, industry news), and say what you found plainly.",
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
  ]
    .filter(Boolean)
    .join("\n");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { message, context } = (req.body ?? {}) as ChatRequestBody;
  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return res.status(400).json({ error: "message is required" });
  }

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
        system: buildSystemPrompt(context),
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
