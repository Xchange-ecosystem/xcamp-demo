// src/components/demo/PersonaSwitcher.tsx
// Extracted from DemoNavRail so it can be reused as-is inside
// CompanionAltitudeDrawer (see src/components/demo/companion/) without a
// second implementation. Same three persona index routes, same dropdown —
// only the trigger's container styling is now caller-controlled via
// `className` so it can sit in a sidebar footer or a drawer alike.
import { Link } from "@tanstack/react-router";
import { ChevronsUpDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { DemoPersona } from "@/components/demo/DemoNavRail";

interface PersonaOption {
  id: DemoPersona;
  label: string;
  to: string;
}

// The three persona index routes — same destinations linked elsewhere in
// the demo, just surfaced here as a switcher instead of separate links.
// Switching persona re-arrives at that persona's /start landing (logo +
// greeting + altitude tiles) rather than dropping straight into their
// platform screen — same "first arrival" experience either way in.
const PERSONAS: PersonaOption[] = [
  { id: "founder", label: "Founder", to: "/demo/founder/start" },
  { id: "investor", label: "Investor", to: "/demo/investor/start" },
  { id: "collaborator", label: "Collaborator", to: "/demo/collaborator/start" },
];

interface PersonaSwitcherProps {
  persona: DemoPersona;
  className?: string;
}

export function PersonaSwitcher({ persona, className }: PersonaSwitcherProps) {
  const current = PERSONAS.find((p) => p.id === persona) ?? PERSONAS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-accent/50",
            className,
          )}
          style={{ borderColor: "var(--skin-line)", background: "var(--skin-surface)" }}
        >
          <span className="font-medium text-foreground">{current.label}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[13rem]">
        {PERSONAS.map((p) => (
          <DropdownMenuItem key={p.id} asChild disabled={p.id === persona}>
            <Link to={p.to} className="w-full cursor-pointer">
              {p.label}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
