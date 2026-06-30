import { useEffect, useRef, useState } from "react";

interface Props {
  text: string;
  /** Total target duration in ms (for future TTS sync). Omit for 38ms/char default. */
  targetMs?: number;
  /** Called when the typewriter finishes (or when text is empty). */
  onDone?: () => void;
  /** Show blinking caret while typing. */
  caret?: boolean;
  className?: string;
}

export function Typewriter({ text, targetMs, onDone, caret = true, className }: Props) {
  const [typed, setTyped] = useState("");
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (!text) {
      setTyped("");
      onDoneRef.current?.();
      return;
    }
    setTyped("");
    const len = text.length;
    const perChar = targetMs && targetMs > 200 ? Math.max(12, targetMs / len) : 38;
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setTyped(text.slice(0, i));
      if (i >= len) {
        window.clearInterval(id);
        onDoneRef.current?.();
      }
    }, perChar);
    return () => window.clearInterval(id);
  }, [text, targetMs]);

  const done = typed.length >= text.length;
  return (
    <span className={className}>
      {typed}
      {caret && !done && (
        <span
          className="ml-1 inline-block w-[2px] h-[1em] align-[-0.15em] animate-pulse"
          style={{ background: "var(--skin-accent)" }}
        />
      )}
    </span>
  );
}
