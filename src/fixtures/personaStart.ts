// Copy + routing config for the persona "start" landing screens
// (demo.<persona>_.start.tsx). One entry per persona so PersonaStartScreen
// stays persona-agnostic and new personas only need a new entry here, not a
// new component.
//
// Demo-user names match the person already used as "you" for that persona
// elsewhere in the codebase: Maren Solberg is the Founder Home greeting
// (demo.founder.index.tsx), Yuki Tanaka is the established default
// collaborator (see DEFAULT_ASSIGNEE_ID in demo.founder.index.tsx), Ingrid
// Halvorsen is the first investor fixture (src/fixtures/people.ts) and
// matches the Fjord Ventures references already used across the ambient
// toast pools.
import type { DemoPersona } from "@/components/demo/DemoNavRail";

export interface PersonaStartConfig {
  persona: DemoPersona;
  /** First name only, for the greeting line. */
  name: string;
  /** Guided-mode "here's what moved" intro line. */
  guidedIntro: string;
  /** Broad-mode explainer line, typed out before the entry button. */
  broadExplainer: string;
  /** Where the Broad button and a Guided card's "Details" fall back to —
   *  the persona's existing platform-level screen. */
  broadTarget: string;
  /** Where a Guided card click opens with the card's content preloaded.
   *  Only Founder has a Companion route today (Phase 0 audit) — Investor
   *  and Collaborator fall back to broadTarget until they get one. */
  companionTarget: string | null;
}

export const PERSONA_START: Record<DemoPersona, PersonaStartConfig> = {
  founder: {
    persona: "founder",
    name: "Maren",
    guidedIntro: "Here are the latest updates from your project.",
    broadExplainer:
      "Broad gives you the full platform — every project, every lever, laid out for you to steer directly.",
    broadTarget: "/demo/founder",
    companionTarget: "/demo/founder/companion",
  },
  investor: {
    persona: "investor",
    name: "Ingrid",
    guidedIntro: "Here's what moved across your portfolio.",
    broadExplainer:
      "Broad gives you the full platform — the ranked portfolio and ecosystem metrics, laid out for you to steer directly.",
    broadTarget: "/demo/investor",
    // No Investor Companion route exists yet — cards open the portfolio
    // screen instead until one is built.
    companionTarget: null,
  },
  collaborator: {
    persona: "collaborator",
    name: "Yuki",
    guidedIntro: "Here's what moved on your assignments.",
    broadExplainer:
      "Broad gives you the full platform — every assignment and your value wallet, laid out for you to steer directly.",
    broadTarget: "/demo/collaborator",
    // No Collaborator Companion route exists yet — cards open the
    // assignments screen instead until one is built.
    companionTarget: null,
  },
};
