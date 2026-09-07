// api/recap/publish.ts
//
// Vercel serverless function. Writes the reviewed Recap session to Supabase
// using the service-role key (never exposed to the client — holds full
// table access, bypasses RLS) and sends one personalised email per
// recipient via SendGrid.
//
// Nothing here touches production economy tables (objectives, assignments,
// contracts, wallet_ledger, reward_issuances, funds) or calls any real
// lifecycle RPC.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

interface FollowupInput {
  owner_name: string;
  task_title: string;
  task_description?: string;
  illustrative_value?: number;
}

interface RecipientInput {
  name: string;
  email: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    title,
    organization,
    meeting_date,
    presenter_name,
    followups,
    recipients,
    email_subject,
    email_body_template,
  } = (req.body ?? {}) as {
    title?: string;
    organization?: string;
    meeting_date?: string;
    presenter_name?: string;
    followups?: FollowupInput[];
    recipients?: RecipientInput[];
    email_subject?: string;
    email_body_template?: string; // supports {first_name} and {recap_url}
  };

  if (
    !title ||
    !presenter_name ||
    !Array.isArray(followups) ||
    !Array.isArray(recipients) ||
    recipients.length === 0
  ) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const sendgridKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL;

  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'Supabase service credentials not configured' });
  }
  if (!sendgridKey || !fromEmail) {
    return res.status(500).json({ error: 'SendGrid credentials not configured' });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: session, error: sessionErr } = await supabase
    .from('recap_sessions')
    .insert({ title, organization, meeting_date, presenter_name })
    .select()
    .single();

  if (sessionErr || !session) {
    return res.status(500).json({ error: 'Failed to create recap session', detail: sessionErr?.message });
  }

  if (followups.length > 0) {
    const followupRows = followups.map((f, i) => ({
      session_id: session.id,
      owner_name: f.owner_name,
      task_title: f.task_title,
      task_description: f.task_description ?? null,
      illustrative_value: f.illustrative_value ?? null,
      sort_order: i,
    }));
    const { error: followupErr } = await supabase.from('recap_followups').insert(followupRows);
    if (followupErr) {
      return res.status(500).json({ error: 'Failed to save follow-ups', detail: followupErr.message });
    }
  }

  const recipientRows = recipients.map((r) => ({ session_id: session.id, name: r.name, email: r.email }));
  const { data: insertedRecipients, error: recipientErr } = await supabase
    .from('recap_recipients')
    .insert(recipientRows)
    .select();

  if (recipientErr || !insertedRecipients) {
    return res.status(500).json({ error: 'Failed to save recipients', detail: recipientErr?.message });
  }

  const baseUrl = process.env.RECAP_PUBLIC_BASE_URL || `https://${req.headers.host}`;
  const emailResults: { email: string; sent: boolean }[] = [];

  for (const recipient of insertedRecipients) {
    const recapUrl = `${baseUrl}/recap/${recipient.token}`;
    const personalizedBody = (email_body_template ?? '')
      .replace(/{first_name}/g, recipient.name.split(' ')[0] ?? recipient.name)
      .replace(/{recap_url}/g, recapUrl);

    const sgResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sendgridKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: recipient.email, name: recipient.name }] }],
        from: { email: fromEmail },
        subject: email_subject ?? `Follow-ups from ${title}`,
        content: [{ type: 'text/plain', value: personalizedBody }],
      }),
    });

    if (sgResponse.ok) {
      await supabase
        .from('recap_recipients')
        .update({ email_sent_at: new Date().toISOString() })
        .eq('id', recipient.id);
    }

    emailResults.push({ email: recipient.email, sent: sgResponse.ok });
  }

  return res.status(200).json({
    session_id: session.id,
    recipients: insertedRecipients.map((r) => ({
      name: r.name,
      email: r.email,
      url: `${baseUrl}/recap/${r.token}`,
    })),
    email_results: emailResults,
  });
}
