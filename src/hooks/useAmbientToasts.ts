// Ambient toast scheduler for the /demo/* persona pages — fires on "page
// arrival" (or persona switch), not in response to any user action. Ported
// from the approved Founder Home prototype: same delay/spacing model, same
// randomization, same 2-4 toasts per arrival. Reactive toasts (Review /
// Dismiss / Send to Chi, etc.) are a separate, already-immediate mechanism
// and are untouched by this hook.
//
// In-memory only — resets on page load or persona switch, nothing is
// persisted.
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  AMBIENT_TOAST_TEMPLATES,
  randInt,
  shuffled,
  type AmbientToastKind,
} from "@/components/demo/ambientToastPools";
import type { DemoPersona } from "@/components/demo/DemoNavRail";

// How long each toast kind stays up before auto-dismissing — matches the
// approved prototype's TOAST_KIND life values.
const TOAST_DURATION: Record<AmbientToastKind, number> = {
  positive: 2600,
  change: 4200,
  announcement: 5200,
  cta: 7500,
};

export function useAmbientToasts(persona: DemoPersona) {
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];

    const pool = shuffled(AMBIENT_TOAST_TEMPLATES[persona]);
    const count = randInt(2, 4);
    let cursor = randInt(3000, 8000); // initial arrival delay

    for (let i = 0; i < count; i++) {
      const template = pool[i % pool.length];
      const timer = setTimeout(() => {
        const { kind, title, body, ctaLabel } = template();
        const options = {
          description: body,
          duration: TOAST_DURATION[kind],
          // No real destination exists for any CTA yet — clicking it must
          // still close the toast cleanly. Sonner already dismisses the
          // toast after an action's onClick runs (unless the handler calls
          // event.preventDefault(), which this never does), so an empty
          // handler is enough — same as clicking the X.
          action: ctaLabel ? { label: ctaLabel, onClick: () => {} } : undefined,
        };
        if (kind === "positive") {
          toast.success(title, options);
        } else {
          toast(title, options);
        }
      }, cursor);
      timers.current.push(timer);
      cursor += randInt(6000, 15000); // gap before next
    }

    return () => timers.current.forEach(clearTimeout);
  }, [persona]);
}
