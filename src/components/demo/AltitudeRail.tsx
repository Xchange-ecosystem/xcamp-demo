// src/components/demo/AltitudeRail.tsx
// Sticky right-edge altitude switch — mounted for every persona (session
// spec: "everywhere show the altitude rail"). Visual language borrows
// CompanionRail's collapsed tab-strip pattern (fixed, right-edge, rounded
// left corners, skin surface/line tokens) since that's the established
// "docked control at the viewport edge" idiom in this codebase, without
// importing CompanionRail itself — that component is a different, unrelated
// rail (mood/appearance/detail-search panel).
import { useState } from "react";
import { Compass, MessageCircle, Sparkles } from "lucide-react";
import { NO_COMPANION_SHELL, type DemoAltitude } from "@/hooks/useDemoAltitude";
import type { DemoPersona } from "@/components/demo/DemoNavRail";

interface AltitudeSegment {
  key: DemoAltitude;
  label: string;
  icon: typeof Compass;
}

const SEGMENTS: AltitudeSegment[] = [
  { key: "companion", label: "Companion", icon: MessageCircle },
  { key: "app", label: "App-style", icon: Sparkles },
  { key: "platform", label: "Platform", icon: Compass },
];

interface AltitudeRailProps {
  persona: DemoPersona;
  altitude: DemoAltitude;
  onSelect: (altitude: DemoAltitude) => void;
}

export function AltitudeRail({ persona, altitude, onSelect }: AltitudeRailProps) {
  const disabledKeys: DemoAltitude[] = ["app"];
  if (NO_COMPANION_SHELL.includes(persona)) disabledKeys.push("companion");

  // Hover info box — "Toggle your world": same data, different feel. Own
  // hover state (not CSS :hover) so the box can sit outside the nav's
  // clipped bounds without a wrapping container changing the rail's fixed
  // positioning/spacing.
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{ position: "fixed", top: 20, right: 0, zIndex: 45 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {hovered && (
        <div
          role="tooltip"
          style={{
            position: "absolute",
            top: 0,
            right: 80,
            width: 208,
            padding: "10px 12px",
            background: "var(--skin-surface)",
            border: "1px solid var(--skin-line)",
            borderRadius: 10,
            boxShadow: "0 4px 20px rgba(0,0,0,0.16)",
            fontSize: 11.5,
            lineHeight: 1.45,
            color: "var(--skin-ink-soft)",
          }}
        >
          <div style={{ fontWeight: 700, color: "var(--skin-ink)", marginBottom: 3 }}>
            Toggle your world
          </div>
          Same data, different feel — pick the altitude that fits how you want to engage right now.
        </div>
      )}
      <nav
        aria-label="Altitude"
        style={{
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
          const disabled = disabledKeys.includes(segment.key);
          return (
            <button
              key={segment.key}
              type="button"
              disabled={disabled}
              aria-pressed={active}
              aria-disabled={disabled || undefined}
              onClick={disabled ? undefined : () => onSelect(segment.key)}
              title={disabled ? `${segment.label} — coming soon` : segment.label}
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
                color: disabled
                  ? "var(--skin-ink-faint)"
                  : active
                    ? "var(--skin-accent)"
                    : "var(--skin-ink-soft)",
                cursor: disabled ? "default" : "pointer",
                opacity: disabled ? 0.55 : 1,
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
    </div>
  );
}
