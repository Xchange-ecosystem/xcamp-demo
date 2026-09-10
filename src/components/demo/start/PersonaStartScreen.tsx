// Full-bleed persona "start" landing — the animated pre-shell screen a
// persona arrives at before choosing an altitude. Deliberately mounted
// outside DemoShell/FounderShell (see the `_` escape in the route file
// names, e.g. demo.founder_.start.tsx) so nothing here fights the app's
// real chrome: no Navrail, no AltitudeRail, just logo → greeting → tiles.
//
// One component for all three personas — persona-specific copy/targets
// come from src/fixtures/personaStart.ts so adding a persona never means
// touching this file.
//
// Tile keys are literally DemoAltitude ("companion" | "app" | "platform"),
// not a separate guided/creative/broad vocabulary — the three modes here
// *are* the three altitudes the rail already switches between elsewhere in
// the app, just titled for a first-arrival audience. Companion-first
// Guidance writes that altitude via writeInitialDemoAltitude and redirects
// straight into it; there's no inline "guided" step to render on this page.
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, Compass, MessageCircle, Sparkles } from "lucide-react";
import { Typewriter } from "@/shared/ui/Typewriter";
import { useBrand } from "@/lib/brand";
import {
  NO_COMPANION_SHELL,
  writeInitialDemoAltitude,
  type DemoAltitude,
} from "@/hooks/useDemoAltitude";
import type { PersonaStartConfig } from "@/fixtures/personaStart";

type Stage = "logo" | "greeting" | "tiles";

interface TileSpec {
  key: DemoAltitude;
  label: string;
  blurb: string;
  icon: typeof Compass;
}

const TILES: TileSpec[] = [
  {
    key: "companion",
    label: "Companion-first Guidance",
    blurb: "Intuitive · Chi walks you through what moved, one card at a time.",
    icon: MessageCircle,
  },
  {
    key: "app",
    label: "App-style Creativity",
    blurb: "Emotional · a freeform, exploratory way in.",
    icon: Sparkles,
  },
  {
    key: "platform",
    label: "Platform Experience",
    blurb: "Cognitive · the full platform, every lever at once.",
    icon: Compass,
  },
];

interface PersonaStartScreenProps {
  config: PersonaStartConfig;
}

export function PersonaStartScreen({ config }: PersonaStartScreenProps) {
  const navigate = useNavigate();
  const { logoUrl, name: brandName } = useBrand();
  const [stage, setStage] = useState<Stage>("logo");
  // Only "app" (Creative) and "platform" (Broad) ever render inline content
  // below the tiles on this page — "companion" redirects immediately, see
  // selectTile below, so it never lingers here as a selected state.
  const [selected, setSelected] = useState<Extract<DemoAltitude, "app" | "platform"> | null>(null);

  // Logo fades/scales in on mount, then the greeting typewriter starts.
  useEffect(() => {
    const t = window.setTimeout(() => setStage("greeting"), 900);
    return () => window.clearTimeout(t);
  }, []);

  const greeting = `Welcome to Xcamp, ${config.name}.\nIt's a beautiful sunny afternoon in Berlin. Let's make the best of it.\nHow do you want to get started?`;

  const companionDisabled = NO_COMPANION_SHELL.includes(config.persona);

  const selectTile = (key: DemoAltitude) => {
    if (key === "companion") {
      if (companionDisabled) return;
      // Redirect straight into the Companion altitude at the persona's own
      // platform route — DemoShell reads this on arrival and swaps in
      // CompanionAltitudeShell itself; there's no separate route to visit.
      writeInitialDemoAltitude("companion");
      navigate({ to: config.platformTarget });
      return;
    }
    setSelected(key);
  };

  return (
    <div
      className="relative flex min-h-screen w-full flex-col items-center overflow-y-auto px-6 py-16"
      style={{
        background:
          "radial-gradient(circle at 50% 38%, #ffffff 0%, #ffffff 42%, var(--skin-accent-soft) 100%)",
      }}
    >
      <div className="flex w-full max-w-xl flex-col items-center text-center">
        {/* Logo */}
        <img
          src={logoUrl}
          alt={brandName}
          className="mb-8 transition-all duration-700 ease-out"
          style={{
            height: 40,
            objectFit: "contain",
            opacity: stage === "logo" ? 0 : 1,
            transform: stage === "logo" ? "scale(0.85) translateY(6px)" : "scale(1) translateY(0)",
          }}
        />

        {/* Greeting */}
        {stage !== "logo" && (
          <h1
            className="whitespace-pre-line text-xl font-semibold leading-snug tracking-tight"
            style={{ color: "var(--skin-ink)", minHeight: "4.5em" }}
          >
            <Typewriter
              text={greeting}
              targetMs={greeting.length * 14}
              onDone={() => setStage("tiles")}
            />
          </h1>
        )}

        {/* Altitude tiles */}
        <div
          className="mt-10 grid w-full grid-cols-1 gap-3 transition-opacity duration-500 sm:grid-cols-3"
          style={{
            opacity: stage === "tiles" ? 1 : 0,
            pointerEvents: stage === "tiles" ? "auto" : "none",
          }}
        >
          {TILES.map((tile) => {
            const active = selected === tile.key;
            const disabled = tile.key === "companion" && companionDisabled;
            return (
              <button
                key={tile.key}
                type="button"
                disabled={disabled}
                onClick={() => selectTile(tile.key)}
                className="flex flex-col items-center gap-2 rounded-2xl border p-4 text-left transition-colors"
                style={{
                  borderColor: active ? "var(--skin-accent)" : "var(--skin-line)",
                  background: active ? "var(--skin-accent-soft)" : "var(--skin-surface)",
                  opacity: disabled ? 0.55 : 1,
                  cursor: disabled ? "default" : "pointer",
                }}
                title={disabled ? "Not available for this persona yet" : undefined}
              >
                <tile.icon
                  size={18}
                  color={active ? "var(--skin-accent)" : "var(--skin-ink-soft)"}
                />
                <span className="text-sm font-semibold" style={{ color: "var(--skin-ink)" }}>
                  {tile.label}
                </span>
                <span className="text-xs" style={{ color: "var(--skin-ink-soft)" }}>
                  {tile.blurb}
                </span>
              </button>
            );
          })}
        </div>

        {/* App-style Creativity — not built for the demo; the tile stays
            selectable (unlike AltitudeRail's inert "App-style" segment) so
            choosing it is itself the answer, typed out rather than just
            disabled. */}
        {selected === "app" && (
          <div className="mt-8 w-full text-center">
            <p className="text-sm font-medium" style={{ color: "var(--skin-ink-soft)" }}>
              <Typewriter text="Not available in demo!" />
            </p>
          </div>
        )}

        {/* Platform Experience */}
        {selected === "platform" && (
          <div className="mt-8 flex w-full flex-col items-center gap-5 text-center">
            <p className="text-sm font-medium" style={{ color: "var(--skin-ink)" }}>
              <Typewriter text={config.platformExplainer} />
            </p>
            <button
              type="button"
              onClick={() => navigate({ to: config.platformTarget })}
              className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: "var(--skin-accent-gradient)" }}
            >
              Enter Platform <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
