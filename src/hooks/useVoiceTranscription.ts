import { useCallback, useEffect, useRef, useState } from "react";

type SR = any;

function getSpeechRecognition(): SR | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function useVoiceTranscription(opts: { lang?: string } = {}) {
  const SR = getSpeechRecognition();
  const supported = !!SR;
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recRef = useRef<any>(null);

  useEffect(
    () => () => {
      try {
        recRef.current?.stop();
      } catch {
        /* ignore */
      }
    },
    [],
  );

  const start = useCallback(() => {
    if (!SR) return;
    const rec = new SR();
    rec.lang = opts.lang ?? "en-US";
    rec.interimResults = true;
    rec.continuous = true;
    rec.onresult = (e: any) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      setTranscript(text);
    };
    rec.onend = () => setIsListening(false);
    rec.onerror = () => setIsListening(false);
    recRef.current = rec;
    setTranscript("");
    try {
      rec.start();
      setIsListening(true);
    } catch {
      /* ignore */
    }
  }, [SR, opts.lang]);

  const stop = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
    setIsListening(false);
  }, []);

  return { transcript, isListening, supported, start, stop, setTranscript };
}
