import { useEffect, useState } from "react";
import { Mic, Square, FilePlus } from "lucide-react";
import xcampIcon from "@/assets/xcamp-icon.png.asset.json";
import { useVoiceTranscription } from "@/hooks/useVoiceTranscription";

type OrbState = "idle" | "listening" | "thinking" | "speaking";

function VoxOrb({
  state = "idle",
  size = 160,
  onClick,
}: {
  state?: OrbState;
  size?: number;
  onClick?: () => void;
}) {
  const [pulse, setPulse] = useState(1);
  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      const t = (now - start) / 1000;
      const speed =
        state === "listening" ? 3.2 : state === "speaking" ? 4.5 : state === "thinking" ? 1.6 : 1.0;
      const amp = state === "idle" ? 0.03 : 0.08;
      setPulse(1 + Math.sin(t * speed) * amp);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [state]);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Voice orb — ${state}`}
      className="relative shrink-0 rounded-full outline-none transition-transform cursor-pointer"
      style={{
        width: size,
        height: size,
        transform: `scale(${pulse})`,
        background:
          "radial-gradient(circle at 30% 30%, #4de0c1, #34acbf 55%, var(--skin-surface) 100%)",
        boxShadow: `0 0 ${size * 0.45}px ${size * 0.06}px rgba(77,224,193,0.45), inset 0 0 ${
          size * 0.22
        }px rgba(255,255,255,0.25)`,
      }}
    >
      <span
        className="pointer-events-none absolute inset-2 rounded-full opacity-70"
        style={{
          background:
            "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.6), rgba(255,255,255,0) 55%)",
        }}
      />
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <img
          src={xcampIcon.url}
          alt=""
          style={{ width: size * 0.5, height: size * 0.5, filter: "brightness(0) invert(1)" }}
        />
      </span>
    </button>
  );
}

export function VoiceTranscriber({
  onCreateNote,
}: {
  onCreateNote?: (text: string) => void;
}) {
  const voice = useVoiceTranscription();

  const toggle = () => {
    if (voice.isListening) voice.stop();
    else voice.start();
  };

  const text = voice.transcript.trim();
  const canCreate = !voice.isListening && text.length > 0;

  return (
    <div className="flex flex-col items-center gap-6 py-6">
      <VoxOrb state={voice.isListening ? "listening" : "idle"} size={160} onClick={toggle} />

      <div className="flex items-center gap-3">
        <button className="x-btn-primary" style={{ width: "auto", paddingInline: 18 }} onClick={toggle}>
          {voice.isListening ? (
            <>
              <Square size={14} style={{ display: "inline", marginRight: 6 }} /> Stop
            </>
          ) : (
            <>
              <Mic size={14} style={{ display: "inline", marginRight: 6 }} /> Start recording
            </>
          )}
        </button>
      </div>

      <div
        className="w-full max-w-2xl rounded-xl p-4 text-center min-h-[6em] flex items-center justify-center"
        style={{ background: "var(--skin-surface2)", border: "1px solid var(--skin-line)" }}
      >
        {voice.transcript ? (
          <p style={{ fontSize: 16, color: "var(--skin-ink)", lineHeight: 1.6 }}>{voice.transcript}</p>
        ) : (
          <p style={{ fontSize: 14, color: "var(--skin-ink-faint)" }}>
            {voice.supported
              ? "Tap the orb or Start recording, then speak. Your words will appear here."
              : "Speech recognition isn't supported in this browser. Try Chrome or Edge."}
          </p>
        )}
      </div>

      {canCreate && (
        <button
          className="x-btn-primary"
          style={{ width: "auto", paddingInline: 18 }}
          onClick={() => onCreateNote?.(text)}
        >
          <FilePlus size={14} style={{ display: "inline", marginRight: 6 }} /> Create note
        </button>
      )}
    </div>
  );
}
