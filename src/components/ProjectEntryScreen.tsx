import { useRef } from "react";
import { useTheme } from "@/lib/theme";
import { useBrand } from "@/lib/brand";
import { useHeroImage } from "@/lib/useHeroImage";
import { useAltitudeStore } from "@/store/altitudeStore";
import { useVoiceTranscription } from "@/hooks/useVoiceTranscription";
import type { ProjectFull } from "@/types/xcamp";

// Altitude accent RGB values — mirrors the token map used for altitude state in sidepanel/Vox.
const ALTITUDE_ACCENT: Record<"xcamp" | "nox", Record<"glide" | "cruise" | "cockpit", string>> = {
  xcamp: { glide: "77,224,193",  cruise: "22,184,154",  cockpit: "52,172,191"  },
  nox:   { glide: "168,85,247",  cruise: "124,58,237",  cockpit: "37,99,235"   },
};
const ALTITUDE_SLUG = ["glide", "cruise", "cockpit"] as const;
const OVERLAY_STRENGTH = 0.35;

const BAR_COUNT = 52;

function buildBars() {
  const n = BAR_COUNT;
  return Array.from({ length: n }, (_, i) => {
    const env = Math.sin((i / (n - 1)) * Math.PI);
    const v = 10 + Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.6)) * 72 * (0.35 + env * 0.65);
    return {
      height: Math.round(v),
      // Negative delay pre-starts the animation mid-cycle, staggering bars without a cold start.
      delay: parseFloat(((-(i * 0.045)) % 1.2).toFixed(2)),
      duration: parseFloat((0.7 + (i % 5) * 0.08).toFixed(2)),
    };
  });
}

interface Props {
  projects: ProjectFull[];
  onProjectSelect: (project: ProjectFull) => void;
  onNewProject: () => void;
  onEnterEcosystem: () => void;
}

export function ProjectEntryScreen({ projects, onProjectSelect, onNewProject, onEnterEcosystem }: Props) {
  const { resolved, setMode } = useTheme();
  const brand = useBrand();
  const isNox = resolved === "dark";
  const { altitude } = useAltitudeStore();
  const { url: heroBgUrl } = useHeroImage(); // no seed → random per load
  const voice = useVoiceTranscription();

  // Stable bar values — generated once at mount.
  const barsRef = useRef(buildBars());
  const bars = barsRef.current;

  const theme = isNox ? "nox" : "xcamp";
  const altKey = ALTITUDE_SLUG[altitude as 0 | 1 | 2] ?? "cruise";
  const rgb = ALTITUDE_ACCENT[theme][altKey];
  const altitudeTint = `linear-gradient(180deg, rgba(${rgb},${OVERLAY_STRENGTH}), rgba(${rgb},${OVERLAY_STRENGTH * 0.55}))`;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
        background: "#0f1c1f",
        fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
      }}
    >
      <style>{`
        @keyframes pe-wave { 0%,100% { transform: scaleY(0.35); } 50% { transform: scaleY(1); } }
        @keyframes pe-fade-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .pe-scroll::-webkit-scrollbar { height: 6px; }
        .pe-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 999px; }
        .pe-tile { transition: transform 150ms ease, box-shadow 150ms ease; }
        .pe-tile:hover { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(10,25,30,0.18); }
        .pe-tile:active { transform: translateY(-1px) scale(0.98); }
        @media (prefers-reduced-motion: reduce) {
          .pe-wave-bar { animation: none !important; }
          .pe-fade-label, .pe-fade-row, .pe-fade-footer { animation: none !important; opacity: 1 !important; }
          .pe-tile { transition: none !important; }
        }
      `}</style>

      {/* ── Background photo — random from "App media/Hero" per load ── */}
      {heroBgUrl && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url("${heroBgUrl}")`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      )}

      {/* ── Brand gradient wash (teal → mint, ~40–55% opacity) ── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "linear-gradient(160deg, rgba(52,172,191,0.55), rgba(77,224,193,0.45) 55%, rgba(15,28,31,0.6))",
        }}
      />

      {/* ── Theme + altitude tint (~30–35% opacity) ── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: altitudeTint,
        }}
      />

      {/* ── Xcamp / Nox toggle — top-right ── */}
      <div
        style={{
          position: "fixed",
          top: 18,
          right: 18,
          zIndex: 60,
          display: "flex",
          alignItems: "center",
          gap: 2,
          background: "rgba(0,0,0,0.35)",
          border: "1px solid rgba(255,255,255,0.15)",
          padding: 3,
          borderRadius: 999,
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
      >
        <ModeSwitchButton
          label="Xcamp"
          active={!isNox}
          onClick={() => setMode("light")}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 13, height: 13 }}>
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
            </svg>
          }
        />
        <ModeSwitchButton
          label="Nox"
          active={isNox}
          dark
          onClick={() => setMode("dark")}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 13, height: 13 }}>
              <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
            </svg>
          }
        />
      </div>

      {/* ── Frosted glass card ── */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 720,
          padding: "40px 44px 36px",
          borderRadius: 28,
          border: "1px solid rgba(255,255,255,0.45)",
          background: "rgba(255,255,255,0.34)",
          backdropFilter: "blur(26px)",
          WebkitBackdropFilter: "blur(26px)",
          boxShadow: "0 24px 60px rgba(10,25,30,0.28)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
        }}
      >
        {/* 1. Brand icon */}
        <img
          src={brand.iconUrl}
          alt={brand.name}
          style={{ width: 132, height: 132, display: "block", objectFit: "contain" }}
        />

        {/* 2. Voice pill — waveform bars animate ambiently; click toggles mic */}
        <button
          type="button"
          onClick={() => (voice.isListening ? voice.stop() : voice.start())}
          title={voice.isListening ? "Stop listening" : "Tap to speak"}
          style={{
            appearance: "none",
            WebkitAppearance: "none",
            border: voice.isListening ? "2px solid var(--skin-accent)" : "2px solid transparent",
            boxSizing: "border-box",
            width: "100%",
            maxWidth: 380,
            background: "#fff",
            borderRadius: 16,
            padding: "18px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 3,
            height: 118,
            boxShadow: "0 2px 8px rgba(10,25,30,0.08)",
            cursor: "pointer",
            transition: "border-color 150ms ease",
          }}
        >
          {bars.map((bar, i) => (
            <span
              key={i}
              className="pe-wave-bar"
              style={{
                display: "block",
                width: 3,
                height: bar.height,
                borderRadius: 2,
                background: "var(--skin-accent)",
                transformOrigin: "center",
                animation: `pe-wave ${bar.duration}s ease-in-out ${bar.delay}s infinite`,
              }}
            />
          ))}
        </button>

        {/* 3. Heading */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
            marginTop: 4,
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: 34,
              fontWeight: 600,
              letterSpacing: "-0.01em",
              color: "var(--skin-ink)",
              textAlign: "center",
            }}
          >
            Welcome to {isNox ? "Nox" : "Xcamp"}.
          </h1>

          {/* 4a. Staggered fade — "Tab your project" label */}
          <p
            className="pe-fade-label"
            style={{
              margin: 0,
              fontSize: 15,
              color: "var(--skin-ink-soft)",
              textAlign: "center",
              opacity: 0,
              animation: "pe-fade-up 0.6s ease-out 0.4s forwards",
            }}
          >
            Tab your project
          </p>
        </div>

        {/* 4b/5. Staggered fade — horizontally scrollable project row */}
        <div
          className="pe-scroll pe-fade-row"
          style={{
            width: "100%",
            display: "flex",
            gap: 16,
            marginTop: 4,
            overflowX: "auto",
            paddingBottom: 4,
            opacity: 0,
            animation: "pe-fade-up 0.6s ease-out 0.7s forwards",
          }}
        >
          {projects.map((project) => (
            <button
              key={project.id}
              type="button"
              className="pe-tile"
              onClick={() => onProjectSelect(project)}
              style={{
                appearance: "none",
                WebkitAppearance: "none",
                border: "none",
                padding: 0,
                margin: 0,
                font: "inherit",
                boxSizing: "border-box",
                flex: "0 0 200px",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                background: "#fff",
                borderRadius: 16,
                overflow: "hidden",
                boxShadow: "var(--shadow-card)",
                textAlign: "left",
              }}
            >
              {/* Feature image — 4:3 aspect */}
              <div
                style={{
                  position: "relative",
                  aspectRatio: "4 / 3",
                  background: project.color ?? "hsl(210 20% 95%)",
                  flexShrink: 0,
                  overflow: "hidden",
                }}
              >
                {project.feature_image && (
                  <img
                    src={project.feature_image}
                    alt=""
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                )}
              </div>
              {/* Project title */}
              <div
                style={{
                  padding: "14px 16px 18px",
                  fontSize: 16,
                  fontWeight: 600,
                  color: "var(--skin-ink)",
                  lineHeight: 1.3,
                }}
              >
                {project.name}
              </div>
            </button>
          ))}

          {/* 6. Start a new project — same card shape, pinned at row end */}
          <button
            type="button"
            className="pe-tile"
            onClick={onNewProject}
            style={{
              appearance: "none",
              WebkitAppearance: "none",
              border: "none",
              margin: 0,
              font: "inherit",
              boxSizing: "border-box",
              flex: "0 0 200px",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 14,
              background: "#fff",
              borderRadius: 16,
              padding: "24px 12px",
              boxShadow: "var(--shadow-card)",
              minHeight: 168,
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 999,
                border: "2px solid var(--skin-line)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--skin-ink-soft)",
              }}
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
            </div>
            <span
              style={{
                fontSize: 15,
                color: "var(--skin-ink-soft)",
                textAlign: "center",
                lineHeight: 1.3,
              }}
            >
              Start a new project
            </span>
          </button>
        </div>

        {/* 4c/7. Staggered fade — ecosystem footer */}
        <div
          className="pe-fade-footer"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
            marginTop: 8,
            opacity: 0,
            animation: "pe-fade-up 0.6s ease-out 1s forwards",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 15,
              color: "var(--skin-ink)",
              textAlign: "center",
            }}
          >
            Do you want to work with or invest into a startup?
          </p>
          <button
            type="button"
            onClick={onEnterEcosystem}
            style={{
              appearance: "none",
              WebkitAppearance: "none",
              background: "none",
              border: "none",
              padding: 0,
              margin: 0,
              font: "inherit",
              cursor: "pointer",
              fontSize: 15,
              color: "var(--skin-ink)",
              textDecoration: "underline",
              textUnderlineOffset: "3px",
            }}
          >
            Enter the ecosystem instead.
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

interface ModeSwitchButtonProps {
  label: string;
  active: boolean;
  dark?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}

function ModeSwitchButton({ label, active, dark, onClick, icon }: ModeSwitchButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: "none",
        cursor: "pointer",
        fontSize: 11.5,
        fontWeight: 600,
        padding: "7px 13px",
        borderRadius: 999,
        fontFamily: "inherit",
        display: "flex",
        alignItems: "center",
        gap: 5,
        transition: "background 0.15s ease, color 0.15s ease",
        background: active ? (dark ? "#1a1f29" : "#fff") : "transparent",
        color: active ? (dark ? "#eef2f6" : "#111") : "rgba(255,255,255,0.65)",
      }}
    >
      {icon}
      {label}
    </button>
  );
}
