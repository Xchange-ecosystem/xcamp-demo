// src/components/demo/companion/CompanionAltitudeShell.tsx
//
// Companion-first guidance altitude, mounted by DemoShell in place of the
// normal Navrail + routed page when altitude === "companion" (see
// useDemoAltitude). Originally Founder-only; now shared by all three
// personas — see buildCompanionContext.ts for how each persona's fixture
// grounding differs, and DemoShell/InvestorShell for how an investor's
// currently-active project (if any) reaches this component as `projectId`.
// Named "*AltitudeShell" rather than "CompanionShell" because
// src/components/CompanionShell.tsx already exists — the real chrome for
// the live /home surface — and is an unrelated component; reusing that name
// here would be confusing next to it, not with it.
//
// This is a self-contained demo simulation, no Supabase writes — but the
// composer's send handler below does make one real call: POSTs to
// api/companion/chat.ts (Anthropic Messages API, web search enabled), the
// only real AI call in the demo. Deterministic, non-AI chat side-effects
// (deriveChatSideEffects.ts) run alongside it for the Founder persona only
// (its fixture model — advancing objectives/tasks/invites — doesn't map
// onto Investor/Collaborator data), independent of what the model replies.
// Background photo comes from the same bucket utility ProjectEntryScreen
// uses (useHeroImage); the tabbed right panel is CompanionInfoPanel
// (fixture-fed, see that file); the burger drawer reuses PersonaSwitcher via
// CompanionAltitudeDrawer.
import { useMemo, useRef, useState } from "react";
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
import { buildCompanionContext } from "@/components/demo/companion/buildCompanionContext";
import {
  deriveChatSideEffects,
  EMPTY_SIDE_EFFECTS,
  type ChatSideEffects,
} from "@/components/demo/companion/deriveChatSideEffects";
import type { DemoPersona } from "@/components/demo/DemoNavRail";

// Horizontal clearance reserved on the right so the drawer/panel-toggle
// button and the info panel never sit under AltitudeRail (fixed, right
// edge, ~68px wide — see AltitudeRail.tsx). AltitudeRail always renders
// alongside this shell for every persona, so the clearance is unconditional.
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
  /** The investor's currently-active project (drilled into from the route),
   *  or `null` at the ecosystem level. Ignored for Founder/Collaborator —
   *  their context has no such notion (Founder is always their one venture;
   *  Collaborator is always their own assignments). */
  projectId?: string | null;
}

export function CompanionAltitudeShell({ persona, projectId = null }: CompanionAltitudeShellProps) {
  // Presentational variety only, picked once per mount (i.e. per visit to
  // this altitude) — same in-memory, non-persisted spirit as the ambient
  // persona toasts (useAmbientToasts resets on page load / persona switch).
  // No manual toggle exists anywhere in this UI on purpose.
  const [bgVariant] = useState<"themed" | "neutral">(() =>
    Math.random() < 0.5 ? "themed" : "neutral",
  );
  const { url: heroUrl } = useHeroImage();
  const [panelOpen, setPanelOpen] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>(COMPANION_ALTITUDE_THREAD[persona]);
  const [isLoading, setIsLoading] = useState(false);
  const [sideEffects, setSideEffects] = useState<ChatSideEffects>(EMPTY_SIDE_EFFECTS);
  const turnIndexRef = useRef(0);

  // Mock context the model's replies can plausibly reference — the same
  // fixture data CompanionInfoPanel reads, scoped per persona (see
  // buildCompanionContext.ts). Recomputed only when persona/projectId
  // change — not on every render — since sideEffects are a presentational
  // overlay on top of the fixtures, not a rewrite of them.
  const chatContext = useMemo(
    () => buildCompanionContext(persona, projectId),
    [persona, projectId],
  );

  const handleSend = async (text: string) => {
    const userId = `ca-user-${Date.now()}`;
    const ackId = `ca-ack-${Date.now()}`;
    setMessages((prev) => [...prev, { id: userId, kind: "user", text }]);

    if (persona === "founder") {
      setSideEffects((prev) => deriveChatSideEffects(text, turnIndexRef.current, prev));
      turnIndexRef.current += 1;
    }

    setIsLoading(true);
    let replyText = COMPANION_ALTITUDE_ACK;
    try {
      const res = await fetch("/api/companion/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, persona, context: chatContext }),
      });
      if (res.ok) {
        const data = (await res.json()) as { reply?: string };
        if (data.reply) replyText = data.reply;
      }
    } catch {
      // Network/API failure — fall back to the canned acknowledgement rather
      // than leaving the composer hanging with no reply at all.
    } finally {
      setIsLoading(false);
    }

    setMessages((prev) => [...prev, { id: ackId, kind: "chi", text: replyText }]);
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
                <ChatThread messages={messages} isLoading={isLoading} />
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
              <CompanionInfoPanel
                persona={persona}
                projectId={projectId}
                sideEffects={sideEffects}
              />
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
