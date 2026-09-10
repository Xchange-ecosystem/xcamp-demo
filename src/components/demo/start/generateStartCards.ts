// Guided-mode start cards — generated from the same
// AMBIENT_TOAST_TEMPLATES pools that drive the ambient toast scheduler
// (src/hooks/useAmbientToasts.ts), per Fabian's instruction to source card
// content + CTAs from "toast topics" rather than inventing a parallel copy
// set. A template call already returns a full AmbientToastSpec
// (title/body?/ctaLabel?) — this just runs a handful of them once (not on
// a randomized interval) and shapes the result into a card.
//
// Used by PersonaStartScreen's "Companion-first Guidance" tile: selecting
// the tile shows these cards inline (intro line + cards + "Show more");
// selecting a card is what redirects into the real Companion altitude.
import { AMBIENT_TOAST_TEMPLATES } from "@/components/demo/ambientToastPools";
import type { DemoPersona } from "@/components/demo/DemoNavRail";

export interface StartCard {
  id: string;
  title: string;
  body?: string;
  ctaLabel: string;
}

const DEFAULT_CTA = "Open";

/**
 * Runs `count` templates from the persona's toast pool once each, in pool
 * order (stable topic mix per mount — the pick()/randInt() calls inside
 * each template still vary the name/number/project on every call).
 */
export function generateStartCards(persona: DemoPersona, count = 5): StartCard[] {
  const pool = AMBIENT_TOAST_TEMPLATES[persona];
  return pool.slice(0, count).map((template, i) => {
    const spec = template();
    return {
      id: `start-card-${persona}-${i}`,
      title: spec.title,
      body: spec.body,
      ctaLabel: spec.ctaLabel ?? DEFAULT_CTA,
    };
  });
}
