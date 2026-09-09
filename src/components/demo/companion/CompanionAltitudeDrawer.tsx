// src/components/demo/companion/CompanionAltitudeDrawer.tsx
//
// Companion altitude has no visible Navrail — instead a floating burger,
// fixed top-left, opens this slide-out drawer. Contains exactly one nav
// item ("Companion", a non-interactive current-location indicator — see
// below) plus the reused PersonaSwitcher (extracted from DemoNavRail; see
// src/components/demo/PersonaSwitcher.tsx).
//
// The "Companion" item is deliberately not a link: /demo/founder/companion
// already exists as a distinct Platform-level nav destination (a much
// simpler standalone chat page). Making this drawer item a plain "you are
// here" indicator — no href, no onClick — means it never points at that
// route, so the two same-named "Companion" surfaces never collide.
import { Menu, MessageCircle } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { PersonaSwitcher } from "@/components/demo/PersonaSwitcher";
import type { DemoPersona } from "@/components/demo/DemoNavRail";

interface CompanionAltitudeDrawerProps {
  persona: DemoPersona;
}

export function CompanionAltitudeDrawer({ persona }: CompanionAltitudeDrawerProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Open menu"
          style={{
            position: "fixed",
            top: 20,
            left: 20,
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
          <Menu size={18} />
        </button>
      </SheetTrigger>

      <SheetContent
        side="left"
        className="flex w-64 flex-col gap-6 p-4"
        style={{ background: "var(--skin-surface2)", borderColor: "var(--skin-line)" }}
      >
        <SheetHeader>
          <SheetTitle className="sr-only">Companion navigation</SheetTitle>
        </SheetHeader>

        <ul className="flex flex-1 flex-col gap-1">
          <li>
            <div
              aria-current="page"
              className="flex items-center gap-2.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground"
            >
              <MessageCircle className="h-4 w-4 shrink-0" />
              Companion
            </div>
          </li>
        </ul>

        <PersonaSwitcher persona={persona} />
      </SheetContent>
    </Sheet>
  );
}
