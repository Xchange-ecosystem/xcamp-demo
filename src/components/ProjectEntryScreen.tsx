import { useMemo } from "react";
import { useTheme } from "@/lib/theme";
import { useBrand } from "@/lib/brand";
import { useHeroImage } from "@/lib/useHeroImage";
import { useAltitudeStore } from "@/store/altitudeStore";
import type { ProjectFull, XcampUser } from "@/types/xcamp";

// Brand orb gradient colours — light/dark contrast tuning, not a brand
// switch. xcamp-companion is single-brand (Xcamp, teal) in both modes; the
// "dark" entry is a brighter teal-family pairing for legibility against a
// dark background, not a different brand hue (was purple/violet — see the
// "amend dark-theme brand color" session).
const ORB_GRADIENT: Record<"light" | "dark", { from: string; to: string }> = {
  light: { from: "#1d9e8f", to: "#1f5fae" },
  dark:  { from: "#1f6b7a", to: "#3cddc2" },
};

// Altitude accent RGB values — mirrors the token map used for altitude state
// in sidepanel/Vox. Same teal family in both modes now (was purple for dark).
const ALTITUDE_ACCENT: Record<"light" | "dark", Record<"glide" | "cruise" | "cockpit", string>> = {
  light: { glide: "77,224,193",  cruise: "22,184,154",  cockpit: "52,172,191"  },
  dark:  { glide: "77,224,193",  cruise: "22,184,154",  cockpit: "52,172,191"  },
};
const ALTITUDE_SLUG = ["glide", "cruise", "cockpit"] as const;
const OVERLAY_STRENGTH = 0.35;

function timeGreeting(): string {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

interface Props {
  projects: ProjectFull[];
  authUser: XcampUser | null;
  onProjectSelect: (project: ProjectFull) => void;
  onNewProject: () => void;
  onEnterEcosystem: () => void;
}

export function ProjectEntryScreen({ projects, authUser, onProjectSelect, onNewProject, onEnterEcosystem }: Props) {
  const { resolved, setMode } = useTheme();
  const brand = useBrand();
  const isDark = resolved === "dark";
  const { altitude } = useAltitudeStore();
  const { url: heroBgUrl } = useHeroImage(); // no seed → random per load

  const theme = isDark ? "dark" : "light";
  const orb = ORB_GRADIENT[theme];
  const orbGradient = `radial-gradient(circle at 35% 30%, ${orb.from}, ${orb.to})`;
  const altKey = ALTITUDE_SLUG[altitude as 0 | 1 | 2] ?? "cruise";
  const rgb = ALTITUDE_ACCENT[theme][altKey];
  const altitudeTint = `linear-gradient(180deg, rgba(${rgb},${OVERLAY_STRENGTH}), rgba(${rgb},${OVERLAY_STRENGTH * 0.55}))`;

  const firstName = authUser?.displayName?.split(" ")?.[0] ?? "there";

  // Exactly 3 tiles, single row, no scrolling. Fewer than 3 projects → show them all.
  // More than 3 → show the most recently updated ones. `updated_at` (added to
  // ProjectFull for this) is the only recency signal available today — there's no
  // separate "last opened"/activity table to define "recent" from.
  const displayedProjects = useMemo(() => {
    if (projects.length <= 3) return projects;
    return [...projects]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 3);
  }, [projects]);

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
        @keyframes pe-orb-pulse { 0%,100% { transform: scale(1); opacity: 0.35; } 50% { transform: scale(1.35); opacity: 0; } }
        @keyframes pe-fade-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .pe-tile { transition: transform 150ms ease, box-shadow 150ms ease; }
        .pe-tile:hover { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(10,25,30,0.18); }
        .pe-tile:active { transform: translateY(-1px) scale(0.98); }
        @media (prefers-reduced-motion: reduce) {
          .pe-orb-pulse { animation: none !important; }
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
          label="Light"
          active={!isDark}
          onClick={() => setMode("light")}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 13, height: 13 }}>
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
            </svg>
          }
        />
        <ModeSwitchButton
          label="Dark"
          active={isDark}
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
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(26px)",
          WebkitBackdropFilter: "blur(26px)",
          boxShadow: "0 24px 60px rgba(10,25,30,0.28)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
        }}
      >
        {/* 1. Pulsing gradient orb with brand mark */}
        <div style={{ position: "relative", width: 96, height: 96 }}>
          <div
            className="pe-orb-pulse"
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background: orbGradient,
              opacity: 0.35,
              animation: "pe-orb-pulse 2.6s ease-in-out infinite",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background: orbGradient,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img
              src={brand.iconUrl}
              alt={brand.name}
              style={{ width: "60%", height: "60%", objectFit: "contain", borderRadius: 6 }}
            />
          </div>
        </div>

        {/* 2. Greeting */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
            textAlign: "center",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: 26,
              fontWeight: 600,
              letterSpacing: "-0.01em",
              color: "var(--skin-ink)",
            }}
          >
            {timeGreeting()}, {firstName}.
          </h1>
          <p style={{ margin: 0, fontSize: 15, color: "var(--skin-ink)" }}>
            I am your companion, always at your service.
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 17, fontWeight: 600, color: "var(--skin-ink)" }}>
            I am ready. Are you?
          </p>
          <p
            className="pe-fade-label"
            style={{
              margin: "6px 0 0",
              fontSize: 13,
              color: "var(--skin-ink-soft)",
              opacity: 0,
              animation: "pe-fade-up 0.6s ease-out 0.4s forwards",
            }}
          >
            Tap a project to get started
          </p>
        </div>

        {/* 3. Exactly 3 project tiles in a single row */}
        <div
          className="pe-fade-row"
          style={{
            width: "100%",
            display: "flex",
            gap: 16,
            justifyContent: "center",
            opacity: 0,
            animation: "pe-fade-up 0.6s ease-out 0.7s forwards",
          }}
        >
          {displayedProjects.length > 0 ? (
            displayedProjects.map((project) => (
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
                  flex: "1 1 0",
                  minWidth: 0,
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
            ))
          ) : (
            // No projects yet — the mockup assumes at least one exists; this keeps
            // the screen usable for a brand-new tenant with nothing to tap yet.
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
                flex: "1 1 0",
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
          )}
        </div>

        {/* 4. Ecosystem footer */}
        <div
          className="pe-fade-footer"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
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
