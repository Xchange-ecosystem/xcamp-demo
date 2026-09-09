// src/components/demo/AltitudeRail.tsx
// Sticky right-edge altitude switch — Founder persona only (see DemoShell,
// which mounts this conditionally rather than hiding it with CSS). Visual
// language borrows CompanionRail's collapsed tab-strip pattern (fixed,
// right-edge, rounded left corners, skin surface/line tokens) since that's
// the established "docked control at the viewport edge" idiom in this
// codebase, without importing CompanionRail itself — that component is a
// different, unrelated rail (mood/appearance/detail-search panel).
import { Compass, MessageCircle, Sparkles } from "lucide-react";
import type { DemoAltitude } from "@/hooks/useDemoAltitude";

interface AltitudeSegment {
  key: DemoAltitude;
  label: string;
  icon: typeof Compass;
  disabled?: boolean;
}

const SEGMENTS: AltitudeSegment[] = [
  { key: "companion", label: "Companion", icon: MessageCircle },
  // Placeholder for a future round — visible, deliberately inert. See
  // session spec: "not removed and not hidden."
  { key: "app", label: "App-style", icon: Sparkles, disabled: true },
  { key: "platform", label: "Platform", icon: Compass },
];

interface AltitudeRailProps {
  altitude: DemoAltitude;
  onSelect: (altitude: DemoAltitude) => void;
}

export function AltitudeRail({ altitude, onSelect }: AltitudeRailProps) {
  return (
    <nav
      aria-label="Altitude"
      style={{
        position: "fixed",
        top: 20,
        right: 0,
        zIndex: 45,
        display: "flex",
        flexDirection: "column",
        background: "var(--skin-surface)",
        border: "1px solid var(--skin-line)",
        borderRight: "none",
        borderRadius: "12px 0 0 12px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.16)",
        overflow: "hidden",
      }}
    >
      {SEGMENTS.map((segment, i) => {
        const active = altitude === segment.key;
        return (
          <button
            key={segment.key}
            type="button"
            disabled={segment.disabled}
            aria-pressed={active}
            aria-disabled={segment.disabled || undefined}
            onClick={segment.disabled ? undefined : () => onSelect(segment.key)}
            title={segment.disabled ? `${segment.label} — coming soon` : segment.label}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              width: 68,
              padding: "10px 6px",
              border: "none",
              borderBottom: i < SEGMENTS.length - 1 ? "1px solid var(--skin-line)" : "none",
              background: active ? "var(--skin-surface2)" : "transparent",
              color: segment.disabled
                ? "var(--skin-ink-faint)"
                : active
                  ? "var(--skin-accent)"
                  : "var(--skin-ink-soft)",
              cursor: segment.disabled ? "default" : "pointer",
              opacity: segment.disabled ? 0.55 : 1,
              fontSize: 10.5,
              fontWeight: active ? 700 : 500,
              lineHeight: 1.3,
              textAlign: "center",
            }}
          >
            <segment.icon size={16} />
            {segment.label}
          </button>
        );
      })}
    </nav>
  );
}
