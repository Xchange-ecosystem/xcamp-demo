// Supabase Edge Function: elevenlabs-tts
// Proxies ElevenLabs TTS so the API key stays server-side.
// Streams audio/mpeg bytes back to the client for low time-to-first-audio.
// Returns 204 when ELEVENLABS_API_KEY is not configured so the client can
// silently fall back to typewriter-only.
//
// Deploy: supabase functions deploy elevenlabs-tts --project-ref <your-project-ref>
// Required secrets (set via `supabase secrets set`):
//   ELEVENLABS_API_KEY  — ElevenLabs API key
//   ALLOWED_ORIGIN      — exact app origin, e.g. https://app.example.com

// Restrict CORS to the configured app origin only.
// An absent / empty ALLOWED_ORIGIN means no cross-origin requests are allowed.
const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "";

function corsHeaders(origin: string): Record<string, string> {
  if (!ALLOWED_ORIGIN || origin !== ALLOWED_ORIGIN) {
    // No match — return no CORS headers; browser will block the preflight/request.
    return {};
  }
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    Vary: "Origin",
  };
}

const DEFAULT_VOICE = "JBFqnCBsd6RMkjVDRZzb"; // George
const DEFAULT_MODEL = "eleven_flash_v2_5"; // ~75ms server-side synthesis

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") ?? "";
  const ch = corsHeaders(origin);

  if (req.method === "OPTIONS") return new Response("ok", { headers: ch });

  // GET /voices — list available ElevenLabs voices
  if (req.method === "GET") {
    const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ voices: [] }), {
        status: 200,
        headers: { ...ch, "Content-Type": "application/json" },
      });
    }
    try {
      const res = await fetch("https://api.elevenlabs.io/v1/voices", {
        headers: { "xi-api-key": apiKey },
        signal: req.signal,
      });
      if (!res.ok) {
        return new Response(JSON.stringify({ voices: [] }), {
          status: 200,
          headers: { ...ch, "Content-Type": "application/json" },
        });
      }
      const data: { voices?: Array<{ voice_id: string; name: string; category?: string }> } =
        await res.json();
      const voices = (data.voices ?? []).map((v) => ({ id: v.voice_id, label: v.name }));
      return new Response(JSON.stringify({ voices }), {
        status: 200,
        headers: { ...ch, "Content-Type": "application/json" },
      });
    } catch {
      return new Response(JSON.stringify({ voices: [] }), {
        status: 200,
        headers: { ...ch, "Content-Type": "application/json" },
      });
    }
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...ch, "Content-Type": "application/json" },
    });
  }

  const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
  if (!apiKey) return new Response(null, { status: 204, headers: ch });

  let body: { text?: string; voiceId?: string; modelId?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { ...ch, "Content-Type": "application/json" },
    });
  }

  const text = (body.text ?? "").toString().trim();
  if (!text) {
    return new Response(JSON.stringify({ error: "missing_text" }), {
      status: 400,
      headers: { ...ch, "Content-Type": "application/json" },
    });
  }
  if (text.length > 4000) {
    return new Response(JSON.stringify({ error: "text_too_long" }), {
      status: 400,
      headers: { ...ch, "Content-Type": "application/json" },
    });
  }

  const voiceId = body.voiceId || DEFAULT_VOICE;
  const modelId = body.modelId || DEFAULT_MODEL;

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text, model_id: modelId }),
        signal: req.signal,
      },
    );

    if (!res.ok) {
      const errText = await res.text();
      return new Response(errText || "tts_failed", {
        status: res.status,
        headers: { ...ch, "Content-Type": "text/plain" },
      });
    }

    if (!res.body) {
      return new Response("tts_no_body", {
        status: 502,
        headers: { ...ch, "Content-Type": "text/plain" },
      });
    }

    return new Response(res.body, {
      status: 200,
      headers: {
        ...ch,
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (e) {
    if (req.signal.aborted) {
      return new Response("aborted", { status: 499, headers: ch });
    }
    return new Response((e as Error).message || "tts_failed", {
      status: 500,
      headers: { ...ch, "Content-Type": "text/plain" },
    });
  }
});
