// src/components/demo/companion/CompanionAltitudeShell.tsx
//
// Companion-first guidance altitude — Founder persona only, mounted by
// DemoShell in place of the normal Navrail + routed page when
// altitude === "companion" (see useDemoAltitude). Named "*AltitudeShell"
// rather than "CompanionShell" because src/components/CompanionShell.tsx
// already exists — the real chrome for the live /home surface — and is an
// unrelated component; reusing that name here would be confusing next to
// it, not with it.
//
// This is a self-contained demo simulation: no real chat/AI wiring, no
// Supabase writes. Background photo comes from the same bucket utility
// ProjectEntryScreen uses (useHeroImage); the tabbed right panel is
// CompanionInfoPanel (fixture-fed, see that file); the burger drawer reuses
// PersonaSwitcher via CompanionAltitudeDrawer.
import { useState } from "react";
import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { useHeroImage } from "@/lib/useHeroImage";
import { ChatThread, type ChatMessage } from "@/components/companion/ChatThread";
import { CompanionAltitudeDrawer } from "@/components/demo/companion/CompanionAltitudeDrawer";
import { CompanionAltitudeComposer } from "@/components/demo/companion/CompanionAltitudeComposer";
import { CompanionInfoPanel } from "@/components/demo/companion/CompanionInfoPanel";
import {
  COMPANION_ALTITUDE_ACK,
  COMPANION_ALTITUDE_THREAD,
} from "@/components/demo/companion/companionAltitudeFixtures";
import type { DemoPersona } from "@/components/demo/DemoNavRail";

// Horizontal clearance reserved on the right so the drawer/panel-toggle
// button and the info panel never sit under AltitudeRail (fixed, right
// edge, ~68px wide — see AltitudeRail.tsx). This shell is Founder-only and
// AltitudeRail always renders alongside it, so the clearance is unconditional.
const ALTITUDE_RAIL_CLEARANCE = 84;
// Floor so the panel stays usable at narrow widths; deliberately no ceiling
// — center and panel both use flex:1 so they split the content area evenly
// at typical desktop widths (previously a fixed 400px left the panel at
// under 30% of the available width).
const PANEL_MIN_WIDTH = 360;

// The glass-panel treatment ChatThread already gets on the real /home
// surface (src/routes/home.tsx's GLASS_STYLE + --glass-bg/--glass-border-color/
// --glass-shadow tokens) — reused verbatim rather than inventing a second
// scrim, and applied regardless of background variant (themed or neutral)
// so legibility doesn't depend on which one a session happened to draw.
const CHAT_GLASS_STYLE = {
  "--glass-blur": "18px",
  flex: 1,
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
  borderRadius: 20,
  background: "var(--glass-bg)",
  border: "1px solid var(--glass-border-color)",
  boxShadow: "var(--glass-shadow)",
  backdropFilter: "blur(var(--glass-blur, 18px))",
  WebkitBackdropFilter: "blur(var(--glass-blur, 18px))",
  color: "var(--glass-text)",
  overflow: "hidden",
} as React.CSSProperties;

interface CompanionAltitudeShellProps {
  persona: DemoPersona;
}

export function CompanionAltitudeShell({ persona }: CompanionAltitudeShellProps) {
  // Presentational variety only, picked once per mount (i.e. per visit to
  // this altitude) — same in-memory, non-persisted spirit as the ambient
  // persona toasts (useAmbientToasts resets on page load / persona switch).
  // No manual toggle exists anywhere in this UI on purpose.
  const [bgVariant] = useState<"themed" | "neutral">(() =>
    Math.random() < 0.5 ? "themed" : "neutral",
  );
  const { url: heroUrl } = useHeroImage();
  const [panelOpen, setPanelOpen] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>(COMPANION_ALTITUDE_THREAD);

  const handleSend = (text: string) => {
    const userId = `ca-user-${Date.now()}`;
    const ackId = `ca-ack-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: userId, kind: "user", text },
      { id: ackId, kind: "chi", text: COMPANION_ALTITUDE_ACK },
    ]);
  };

  const showThemedBg = bgVariant === "themed" && !!heroUrl;

  return (
    <div style={{ position: "relative", height: "100vh", width: "100%", overflow: "hidden" }}>
      {/* ── Background ── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: showThemedBg ? undefined : "var(--skin-bg)",
        }}
      >
        {showThemedBg && (
          <>
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage: `url("${heroUrl}")`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(160deg, rgba(15,28,31,0.35), rgba(15,28,31,0.55))",
              }}
            />
          </>
        )}
      </div>

      <CompanionAltitudeDrawer persona={persona} />

      {!panelOpen && (
        <button
          type="button"
          aria-label="Open panel"
          onClick={() => setPanelOpen(true)}
          style={{
            position: "fixed",
            top: 20,
            right: ALTITUDE_RAIL_CLEARANCE,
            zIndex: 46,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 40,
            height: 40,
            borderRadius: 999,
            border: "1px solid var(--glass-border-color)",
            background: "var(--glass-bubble-bg)",
            color: "var(--glass-text)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            cursor: "pointer",
          }}
        >
          <PanelRightOpen size={17} />
        </button>
      )}

      {/* ── Body: center chat column (narrows when the panel opens) + panel ── */}
      <div style={{ position: "relative", display: "flex", height: "100%", width: "100%" }}>
        <div
          style={{
            flex: 1,
            minWidth: 0,
            boxSizing: "border-box",
            display: "flex",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {/* Padding lives on this inner, width-capped wrapper rather than
              the flex item above — keeping the flex item itself padding-free
              is what makes the 50/50 split with the panel wrapper below
              exact, regardless of box-sizing. */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: "100%",
              maxWidth: 680,
              height: "100%",
              minHeight: 0,
              boxSizing: "border-box",
              padding: "80px 24px 24px",
            }}
          >
            <div style={CHAT_GLASS_STYLE}>
              <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 8px" }}>
                <ChatThread messages={messages} />
              </div>
            </div>
            <div style={{ marginTop: 12, flexShrink: 0 }}>
              <CompanionAltitudeComposer onSend={handleSend} />
            </div>
          </div>
        </div>

        {panelOpen && (
          // Direct flex-row child (not overflow:hidden) so the toggle button
          // can sit just outside the panel's own rounded/clipped card while
          // still tracking its real position — no width math needed, unlike
          // the previous fixed-pixel-width version.
          <div
            style={{
              position: "relative",
              flex: 1,
              minWidth: PANEL_MIN_WIDTH,
              boxSizing: "border-box",
              margin: `24px ${ALTITUDE_RAIL_CLEARANCE}px 24px 0`,
            }}
          >
            <button
              type="button"
              aria-label="Close panel"
              onClick={() => setPanelOpen(false)}
              style={{
                position: "absolute",
                top: -4,
                left: -56,
                zIndex: 46,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 40,
                height: 40,
                borderRadius: 999,
                border: "1px solid var(--glass-border-color)",
                background: "var(--glass-bubble-bg)",
                color: "var(--glass-text)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                cursor: "pointer",
              }}
            >
              <PanelRightClose size={17} />
            </button>

            <aside
              style={{
                height: "100%",
                borderRadius: "var(--skin-radius-lg, 22px)",
                border: "1px solid var(--skin-line)",
                overflow: "hidden",
                background: "var(--skin-surface)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.16)",
              }}
            >
              <CompanionInfoPanel />
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
