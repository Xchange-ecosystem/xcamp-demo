import { useRef } from "react";
import { useTheme } from "@/lib/theme";
import { useBrand } from "@/lib/brand";
import type { ProjectFull } from "@/types/xcamp";

// Decorative-only colors with no --skin-* equivalent (aurora wash + skyline silhouette + orb gradient).
const XCAMP = {
  skyline: "#aebccb",
  skyline2: "#93a4b7",
  auroraA: "rgba(31,158,143,0.30)",
  auroraB: "rgba(31,95,174,0.22)",
  orbFrom: "#1d9e8f",
  orbTo: "#1f5fae",
} as const;

const NOX = {
  skyline: "#131a24",
  skyline2: "#0c111a",
  auroraA: "rgba(31,158,143,0.35)",
  auroraB: "rgba(60,52,180,0.30)",
  orbFrom: "#5a5ae0",
  orbTo: "#3fb6c9",
} as const;

const BAR_COUNT = 34;

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
  const t = isNox ? NOX : XCAMP;

  // Stable random bar values — generated once at mount, never re-randomized on re-render.
  const barsRef = useRef(
    Array.from({ length: BAR_COUNT }, () => ({
      height: 6 + Math.round(Math.random() * 18),
      delay: (Math.random() * 1.1).toFixed(2),
      duration: (0.8 + Math.random() * 0.6).toFixed(2),
    }))
  );
  const bars = barsRef.current;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "var(--skin-bg)",
        overflow: "hidden",
        fontFamily: "'Hanken Grotesk', sans-serif",
      }}
    >
      {/* Animation keyframes + hover helpers injected once per render */}
      <style>{`
        @keyframes pe-drift-aurora {
          0%   { transform: translateY(0) scale(1); }
          100% { transform: translateY(3%) scale(1.05); }
        }
        @keyframes pe-orb-pulse {
          0%, 100% { transform: scale(1); opacity: 0.35; }
          50%       { transform: scale(1.35); opacity: 0; }
        }
        @keyframes pe-wave {
          0%, 100% { transform: scaleY(0.4); opacity: 0.5; }
          50%       { transform: scaleY(1); opacity: 0.9; }
        }
        .pe-tile { transition: transform .18s ease, box-shadow .18s ease; }
        .pe-tile:hover { transform: translateY(-3px); box-shadow: 0 10px 24px rgba(0,0,0,0.18); }
        .pe-tile:active { transform: translateY(-1px) scale(0.98); }
      `}</style>

      {/* ── Aurora wash ── */}
      <div
        style={{
          position: "absolute",
          inset: "-20%",
          background: `radial-gradient(ellipse 60% 40% at 20% 10%, ${t.auroraA}, transparent 60%),
                       radial-gradient(ellipse 50% 35% at 75% 5%, ${t.auroraB}, transparent 60%)`,
          filter: "blur(30px)",
          animation: "pe-drift-aurora 22s ease-in-out infinite alternate",
        }}
      />

      {/* ── Dusk skyline ── */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "55%" }}>
        <svg
          viewBox="0 0 1200 400"
          preserveAspectRatio="none"
          style={{ width: "100%", height: "100%", display: "block" }}
        >
          <rect x="0"    y="180" width="60"  height="220" fill={t.skyline2} />
          <rect x="70"   y="120" width="90"  height="280" fill={t.skyline}  />
          <rect x="170"  y="200" width="50"  height="200" fill={t.skyline2} />
          <rect x="230"  y="90"  width="70"  height="310" fill={t.skyline}  />
          <rect x="310"  y="150" width="55"  height="250" fill={t.skyline2} />
          <rect x="375"  y="60"  width="85"  height="340" fill={t.skyline}  />
          <rect x="470"  y="170" width="60"  height="230" fill={t.skyline2} />
          <rect x="540"  y="30"  width="95"  height="370" fill={t.skyline}  />
          <rect x="645"  y="140" width="65"  height="260" fill={t.skyline2} />
          <rect x="720"  y="100" width="80"  height="300" fill={t.skyline}  />
          <rect x="810"  y="200" width="50"  height="200" fill={t.skyline2} />
          <rect x="870"  y="70"  width="90"  height="330" fill={t.skyline}  />
          <rect x="970"  y="160" width="60"  height="240" fill={t.skyline2} />
          <rect x="1040" y="110" width="75"  height="290" fill={t.skyline}  />
          <rect x="1125" y="190" width="75"  height="210" fill={t.skyline2} />
        </svg>
      </div>

      {/* ── Mode switch — top-right ── */}
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

      {/* ── Main shell — centered card ── */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          height: "100vh",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 460,
            background: "var(--skin-surface)",
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
            borderRadius: 28,
            padding: "36px 30px 28px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            boxShadow: "0 30px 80px rgba(0,0,0,0.35)",
          }}
        >
          {/* ── Orb ── */}
          <div style={{ position: "relative", width: 108, height: 108, marginBottom: 18 }}>
            {/* Pulsing outer ring */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                background: `radial-gradient(circle at 35% 30%, ${t.orbFrom}, ${t.orbTo})`,
                opacity: 0.35,
                animation: "pe-orb-pulse 2.6s ease-in-out infinite",
              }}
            />
            {/* Core orb */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                background: `radial-gradient(circle at 35% 30%, ${t.orbFrom}, ${t.orbTo})`,
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

          {/* ── Waveform (decorative mock — no audio) ── */}
          <div
            style={{
              background: "var(--skin-surface2)",
              borderRadius: 999,
              padding: "12px 18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              height: 40,
              width: 220,
              marginBottom: 22,
            }}
          >
            {bars.map((bar, i) => (
              <span
                key={i}
                style={{
                  display: "block",
                  width: 2.5,
                  height: bar.height,
                  borderRadius: 2,
                  background: "var(--skin-accent)",
                  opacity: 0.75,
                  animation: `pe-wave ${bar.duration}s ease-in-out ${bar.delay}s infinite`,
                }}
              />
            ))}
          </div>

          {/* ── Heading ── */}
          <h1
            style={{
              fontWeight: 700,
              letterSpacing: "-0.01em",
              fontSize: 26,
              color: "var(--skin-ink)",
              marginBottom: 6,
              textAlign: "center",
              margin: "0 0 6px",
            }}
          >
            Welcome to {isNox ? "Nox" : "Xcamp"}.
          </h1>
          <div
            style={{
              fontSize: 12.5,
              color: "var(--skin-ink-faint)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              fontWeight: 600,
              marginBottom: 20,
            }}
          >
            Tap your project
          </div>

          {/* ── Project tiles — flex-wrap, 2 per row, matching EcosystemHomeView ProjectTile pattern ── */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              width: "100%",
              marginBottom: 22,
            }}
          >
            {projects.map((project) => (
              <button
                key={project.id}
                className="pe-tile"
                onClick={() => onProjectSelect(project)}
                style={{
                  position: "relative",
                  width: "calc(50% - 5px)",
                  aspectRatio: "3 / 4",
                  borderRadius: 10,
                  overflow: "hidden",
                  cursor: "pointer",
                  border: "1px solid var(--skin-line)",
                  background: "var(--skin-surface2)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-end",
                  padding: 0,
                }}
              >
                {project.feature_image ? (
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
                ) : project.color ? (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: project.color,
                    }}
                  />
                ) : null}
                <div
                  style={{
                    position: "relative",
                    zIndex: 1,
                    padding: "8px 8px 9px",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#fff",
                    background: "linear-gradient(0deg, rgba(0,0,0,0.55), transparent)",
                    textAlign: "left",
                  }}
                >
                  {project.name}
                </div>
              </button>
            ))}

            {/* New project tile */}
            <button
              className="pe-tile"
              onClick={onNewProject}
              style={{
                width: "calc(50% - 5px)",
                aspectRatio: "3 / 4",
                borderRadius: 10,
                overflow: "hidden",
                cursor: "pointer",
                background: "var(--skin-surface2)",
                border: "1.5px dashed var(--skin-line)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--skin-ink-soft)",
                textAlign: "center",
                gap: 6,
                padding: 8,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  border: "1.5px solid var(--skin-ink-faint)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.3 }}>
                Start a new project
              </span>
            </button>
          </div>

          {/* ── Footer link ── */}
          <div
            style={{
              textAlign: "center",
              fontSize: 12.5,
              color: "var(--skin-ink-soft)",
              lineHeight: 1.5,
            }}
          >
            Do you want to work with or invest into a startup?
            <br />
            <button
              onClick={onEnterEcosystem}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                color: "var(--skin-accent)",
                fontWeight: 600,
                textDecoration: "underline",
                cursor: "pointer",
                fontSize: "inherit",
                fontFamily: "inherit",
              }}
            >
              Enter the ecosystem instead.
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

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
        transition: "background .15s ease, color .15s ease",
        background: active ? (dark ? "#1a1f29" : "#fff") : "transparent",
        color: active ? (dark ? "#eef2f6" : "#111") : "rgba(255,255,255,0.65)",
      }}
    >
      {icon}
      {label}
    </button>
  );
}
