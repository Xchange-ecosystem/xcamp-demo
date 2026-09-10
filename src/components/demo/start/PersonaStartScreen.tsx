// Full-bleed persona "start" landing — the animated pre-shell screen a
// persona arrives at before choosing an altitude. Deliberately mounted
// outside DemoShell/FounderShell (see the `_` escape in the route file
// names, e.g. demo.founder_.start.tsx) so nothing here fights the app's
// real chrome: no Navrail, no AltitudeRail, just logo → greeting → tiles.
//
// One component for all three personas — persona-specific copy/targets
// come from src/fixtures/personaStart.ts so adding a persona never means
// touching this file.
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, Compass, MessageCircle, Sparkles } from "lucide-react";
import { Typewriter } from "@/shared/ui/Typewriter";
import { useBrand } from "@/lib/brand";
import { generateStartCards, type StartCard } from "@/components/demo/start/generateStartCards";
import type { PersonaStartConfig } from "@/fixtures/personaStart";

type Stage = "logo" | "greeting" | "tiles";
type StartAltitude = "guided" | "creative" | "broad";

interface TileSpec {
  key: StartAltitude;
  label: string;
  blurb: string;
  icon: typeof Compass;
  disabled?: boolean;
}

const TILES: TileSpec[] = [
  {
    key: "guided",
    label: "Guided",
    blurb: "Intuitive · Chi walks you through what moved, one card at a time.",
    icon: MessageCircle,
  },
  {
    key: "creative",
    label: "Creative",
    blurb: "Emotional · a freeform, exploratory way in.",
    icon: Sparkles,
  },
  {
    key: "broad",
    label: "Broad",
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
  const [altitude, setAltitude] = useState<StartAltitude | null>(null);
  const [guidedStage, setGuidedStage] = useState<"intro" | "cards">("intro");
  const [cardCount, setCardCount] = useState(5);

  // Logo fades/scales in on mount, then the greeting typewriter starts.
  useEffect(() => {
    const t = window.setTimeout(() => setStage("greeting"), 900);
    return () => window.clearTimeout(t);
  }, []);

  const greeting = `Welcome to Xcamp, ${config.name}.\nIt's a beautiful sunny afternoon in Berlin. Let's make the best of it.\nHow do you want to get started?`;

  const openCard = (card: StartCard) => {
    const seed = card.body ? `${card.title} ${card.body}` : card.title;
    if (config.companionTarget) {
      // config.companionTarget is only ever "/demo/founder/companion" today
      // (see personaStart.ts) — that route's validateSearch accepts `seed`.
      // Typed loosely here so this stays generic if/when Investor or
      // Collaborator get their own Companion route with the same contract.
      // `to` is a plain string (persona-agnostic config), not a literal
      // route id from the generated route tree, so `search`'s shape can't
      // be inferred — TS requires routing through `unknown` for a cast
      // this wide rather than a direct one.
      navigate({ to: config.companionTarget, search: { seed } } as unknown as Parameters<
        typeof navigate
      >[0]);
    } else {
      navigate({ to: config.broadTarget });
    }
  };

  const cards = altitude === "guided" ? generateStartCards(config.persona, cardCount) : [];

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
            const active = altitude === tile.key;
            return (
              <button
                key={tile.key}
                type="button"
                disabled={tile.disabled}
                onClick={() => {
                  if (tile.disabled) return;
                  setAltitude(tile.key);
                  setGuidedStage("intro");
                  setCardCount(5);
                }}
                className="flex flex-col items-center gap-2 rounded-2xl border p-4 text-left transition-colors"
                style={{
                  borderColor: active ? "var(--skin-accent)" : "var(--skin-line)",
                  background: active ? "var(--skin-accent-soft)" : "var(--skin-surface)",
                  opacity: tile.disabled ? 0.55 : 1,
                  cursor: tile.disabled ? "default" : "pointer",
                }}
                title={tile.disabled ? "Not available in demo" : undefined}
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

        {/* Guided */}
        {altitude === "guided" && (
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
                    onClick={() => openCard(card)}
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

        {/* Creative — not built for the demo; the tile stays selectable
            (unlike AltitudeRail's inert "App-style" segment) so choosing it
            is itself the answer, typed out rather than just disabled. */}
        {altitude === "creative" && (
          <div className="mt-8 w-full text-center">
            <p className="text-sm font-medium" style={{ color: "var(--skin-ink-soft)" }}>
              <Typewriter text="Not available in demo!" />
            </p>
          </div>
        )}

        {/* Broad */}
        {altitude === "broad" && (
          <div className="mt-8 flex w-full flex-col items-center gap-5 text-center">
            <p className="text-sm font-medium" style={{ color: "var(--skin-ink)" }}>
              <Typewriter text={config.broadExplainer} />
            </p>
            <button
              type="button"
              onClick={() => navigate({ to: config.broadTarget })}
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
