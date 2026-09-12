import { Layers, Map, Milestone } from "lucide-react";

export type NavigatorAltitude = "ecosphere" | "ecosystem" | "project";

const SEGMENTS: { key: NavigatorAltitude; label: string; icon: typeof Layers }[] = [
  { key: "ecosphere", label: "Ecosphere", icon: Layers },
  { key: "ecosystem", label: "Ecosystem", icon: Map },
  { key: "project", label: "Project", icon: Milestone },
];

// Three-stage altitude lever scoping the Ecosystem Navigator's canvas
// (session brief §3) — unrelated to the demo shell's own AltitudeRail
// (Companion/App-style/Platform, a different, pre-existing concept for
// picking how a persona engages with the whole demo). This one only scopes
// what this one screen's network shows.
export function NavigatorAltitudeLever({
  altitude,
  onChange,
}: {
  altitude: NavigatorAltitude;
  onChange: (next: NavigatorAltitude) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Altitude"
      style={{
        display: "inline-flex",
        borderRadius: "var(--xr, 8px)",
        border: "1px solid var(--skin-line)",
        overflow: "hidden",
      }}
    >
      {SEGMENTS.map((seg) => {
        const active = altitude === seg.key;
        return (
          <button
            key={seg.key}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(seg.key)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 13px",
              border: "none",
              borderRight: seg.key !== "project" ? "1px solid var(--skin-line)" : "none",
              background: active ? "var(--skin-accent)" : "var(--skin-surface)",
              color: active ? "var(--skin-on-accent)" : "var(--skin-ink-soft)",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            <seg.icon size={14} />
            {seg.label}
          </button>
        );
      })}
    </div>
  );
}
