// api/recap/extract.ts
//
// Vercel serverless function. Runs server-side only — this is where the LLM
// API key lives (never in a VITE_* var, never in client code).
//
// Input:  { transcript: string }
// Output: { followups: [{ owner_name, task_title, task_description?, illustrative_value? }] }
//
// The transcript itself is never written to any database. Extraction is
// stateless: it runs here, the result goes back to the client for the
// presenter to review/edit, and only the edited result is later persisted
// by api/recap/publish.ts.

import type { VercelRequest, VercelResponse } from '@vercel/node';

const FOLLOWUP_SCHEMA = {
  type: 'object',
  properties: {
    followups: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          owner_name: { type: 'string', description: 'Named participant this follow-up belongs to' },
          task_title: { type: 'string', description: 'Short, concrete task title' },
          task_description: { type: 'string', description: 'One-sentence description, optional' },
          illustrative_value: {
            type: 'number',
            description: 'Only include if a concrete number/value was actually mentioned in the transcript. Never invent one.',
          },
        },
        required: ['owner_name', 'task_title'],
      },
    },
  },
  required: ['followups'],
} as const;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { transcript } = (req.body ?? {}) as { transcript?: string };
  if (!transcript || typeof transcript !== 'string' || transcript.trim().length === 0) {
    return res.status(400).json({ error: 'transcript is required' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content:
              'Extract concrete follow-up tasks from this call transcript. For each follow-up: ' +
              'identify who owns it (a named participant), a short task title, and a one-sentence ' +
              'description. Only include illustrative_value if a concrete number was actually stated — ' +
              'never invent one. Skip vague or non-actionable statements.\n\n' +
              `Transcript:\n${transcript}`,
          },
        ],
        tools: [
          {
            name: 'extract_followups',
            description: 'Return the extracted follow-up tasks as structured data',
            input_schema: FOLLOWUP_SCHEMA,
          },
        ],
        tool_choice: { type: 'tool', name: 'extract_followups' },
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      return res.status(502).json({ error: 'LLM request failed', detail });
    }

    const data = await response.json();
    const toolUse = data.content?.find((block: any) => block.type === 'tool_use');
    if (!toolUse) {
      return res.status(502).json({ error: 'No structured output returned by the model' });
    }

    return res.status(200).json({ followups: toolUse.input?.followups ?? [] });
  } catch (err) {
    return res.status(500).json({ error: 'Extraction failed', detail: String(err) });
  }
}
