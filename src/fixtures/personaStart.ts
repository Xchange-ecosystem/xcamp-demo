// Copy + routing config for the persona "start" landing screens
// (demo.<persona>_.start.tsx). One entry per persona so PersonaStartScreen
// stays persona-agnostic and new personas only need a new entry here, not a
// new component.
//
// The greeting always addresses "Claas" regardless of persona — a live-demo
// personalization (Fabian's own instruction), not a per-persona fixture
// name like the rest of this file. It intentionally does not follow the
// Maren/Yuki/Ingrid pattern used elsewhere for "you" in each persona's own
// screens (e.g. Founder Home's greeting, DEFAULT_ASSIGNEE_ID) — those stay
// untouched; this is the start page's own greeting only.
import type { DemoPersona } from "@/components/demo/DemoNavRail";

export interface PersonaStartConfig {
  persona: DemoPersona;
  /** First name only, for the greeting line. Same value for every persona
   *  by design — see the file header. */
  name: string;
  /** Guided-mode "here's what moved" intro line — currently unused (the
   *  Companion-first Guidance tile redirects straight into the Companion
   *  altitude rather than showing this inline; kept for when that altitude
   *  grows its own onboarding line). */
  guidedIntro: string;
  /** Platform-mode explainer line, typed out before the entry button. */
  platformExplainer: string;
  /** The persona's base platform route — both the Platform Experience
   *  tile's button and the Companion-first Guidance tile (after writing
   *  the "companion" altitude, see useDemoAltitude's
   *  writeInitialDemoAltitude) land here. DemoShell reads the altitude on
   *  arrival and swaps in CompanionAltitudeShell itself when applicable —
   *  there is deliberately no separate "companion route" to target. */
  platformTarget: string;
}

export const PERSONA_START: Record<DemoPersona, PersonaStartConfig> = {
  founder: {
    persona: "founder",
    name: "Claas",
    guidedIntro: "Here are the latest updates from your project.",
    platformExplainer:
      "Platform gives you the full ecosystem — every project, every lever, laid out for you to steer directly.",
    platformTarget: "/demo/founder",
  },
  investor: {
    persona: "investor",
    name: "Claas",
    guidedIntro: "Here's what moved across your portfolio.",
    platformExplainer:
      "Platform gives you the full ecosystem — the ranked portfolio and ecosystem metrics, laid out for you to steer directly.",
    platformTarget: "/demo/investor",
  },
  collaborator: {
    persona: "collaborator",
    name: "Claas",
    guidedIntro: "Here's what moved on your assignments.",
    platformExplainer:
      "Platform gives you the full ecosystem — every assignment and your value wallet, laid out for you to steer directly.",
    platformTarget: "/demo/collaborator",
  },
};
