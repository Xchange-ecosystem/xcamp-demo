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
// the app, just titled for a first-arrival audience. Selecting a tile shows
// inline content below the tiles (same pattern for all three); the actual
// redirect into the Companion altitude (writeInitialDemoAltitude("companion")
// + navigate) now happens one level deeper, on a Guided card click, not on
// the tile click itself — see selectCard below.
//
// Card-seeding gap: the pre-altitude-routing spec wanted a clicked card's
// content to seed the Companion conversation's first message (this used to
// work via a `?seed=` param on the old, now-deleted /demo/founder/companion
// route). CompanionAltitudeShell — the real destination now — has no prop,
// store, or search-param mechanism to accept a starting message on arrival
// (checked: its only prop is `persona`, its message state always
// initializes from the static COMPANION_ALTITUDE_THREAD fixture, and no
// route in the demo.founder.* tree declares a validateSearch). Per
// instruction, this is a known, flagged gap rather than a bolted-on parallel
// seeding mechanism: a card click lands in the Companion altitude with the
// normal starting conversation, not one seeded from the card.
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
import { generateStartCards, type StartCard } from "@/components/demo/start/generateStartCards";
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
  const [selected, setSelected] = useState<DemoAltitude | null>(null);
  const [guidedStage, setGuidedStage] = useState<"intro" | "cards">("intro");
  const [cardCount, setCardCount] = useState(5);

  // Logo fades/scales in on mount, then the greeting typewriter starts.
  useEffect(() => {
    const t = window.setTimeout(() => setStage("greeting"), 900);
    return () => window.clearTimeout(t);
  }, []);

  const greeting = `Welcome to Xcamp, ${config.name}.\nIt's a beautiful sunny afternoon in Berlin. Let's make the best of it.\nHow do you want to get started?`;

  const companionDisabled = NO_COMPANION_SHELL.includes(config.persona);

  const selectTile = (key: DemoAltitude) => {
    if (key === "companion" && companionDisabled) return;
    setSelected(key);
    setGuidedStage("intro");
    setCardCount(5);
  };

  // The redirect into the real Companion altitude happens here now, one
  // level deeper than the tile click. `card` is unused — see the file
  // header's "Card-seeding gap" note: CompanionAltitudeShell has no
  // mechanism to accept the card's content as a starting message, so this
  // is a plain redirect, not a seed. Takes the card anyway so the call site
  // reads naturally and so wiring a real seed through later (once
  // CompanionAltitudeShell grows a mechanism for one) is a local change.
  const selectCard = (card: StartCard) => {
    writeInitialDemoAltitude("companion");
    navigate({ to: config.platformTarget });
  };

  const cards = selected === "companion" ? generateStartCards(config.persona, cardCount) : [];

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
                className="flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-colors"
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
                <span
                  className="text-center text-sm font-semibold"
                  style={{ color: "var(--skin-ink)" }}
                >
                  {tile.label}
                </span>
                <span className="text-center text-xs" style={{ color: "var(--skin-ink-soft)" }}>
                  {tile.blurb}
                </span>
              </button>
            );
          })}
        </div>

        {/* Companion-first Guidance — typewriter intro, then 5 cards (up to
            10 via "Show more") generated once from AMBIENT_TOAST_TEMPLATES
            (generateStartCards). Selecting a card is what redirects into the
            real Companion altitude (selectCard) — the tile click itself
            only shows this inline content, same pattern as the other two
            tiles. */}
        {selected === "companion" && (
          <div className="mt-8 w-full text-left">
            <p className="mb-4 text-sm font-medium" style={{ color: "var(--skin-ink)" }}>
              {guidedStage === "intro" ? (
                <Typewriter text={config.guidedIntro} onDone={() => setGuidedStage("cards")} />
              ) : (
                config.guidedIntro
              )}
            </p>

            {guidedStage === "cards" && (
              <div className="flex flex-col gap-2">
                {cards.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => selectCard(card)}
                    className="flex flex-col gap-1 rounded-xl border p-3.5 text-left transition-colors hover:border-[var(--skin-accent)]"
                    style={{ borderColor: "var(--skin-line)", background: "var(--skin-surface)" }}
                  >
                    <span className="text-sm font-medium" style={{ color: "var(--skin-ink)" }}>
                      {card.title}
                    </span>
                    {card.body && (
                      <span className="text-xs" style={{ color: "var(--skin-ink-soft)" }}>
                        {card.body}
                      </span>
                    )}
                    <span
                      className="mt-1 inline-flex items-center gap-1 text-xs font-semibold"
                      style={{ color: "var(--skin-accent)" }}
                    >
                      {card.ctaLabel} <ArrowRight size={12} />
                    </span>
                  </button>
                ))}
                {cardCount < 10 && (
                  <button
                    type="button"
                    onClick={() => setCardCount((c) => Math.min(c + 5, 10))}
                    className="mt-1 self-start text-xs font-medium underline"
                    style={{ color: "var(--skin-ink-soft)" }}
                  >
                    Show more
                  </button>
                )}
              </div>
            )}
          </div>
        )}

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
