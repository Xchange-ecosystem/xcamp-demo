// src/components/demo/DemoNavRail.tsx
import type { ComponentType } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronsUpDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useBrand } from "@/lib/brand";
import { cn } from "@/lib/utils";

export type DemoPersona = "founder" | "investor" | "collaborator";

export interface DemoNavItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  exact?: boolean;
}

interface PersonaOption {
  id: DemoPersona;
  label: string;
  to: string;
}

// The three persona index routes — same destinations already linked
// elsewhere in the demo, just surfaced here as a switcher instead of
// separate links.
const PERSONAS: PersonaOption[] = [
  { id: "founder", label: "Founder", to: "/demo/founder" },
  { id: "investor", label: "Investor", to: "/demo/investor" },
  { id: "collaborator", label: "Collaborator", to: "/demo/collaborator" },
];

interface DemoNavRailProps {
  persona: DemoPersona;
  items: DemoNavItem[];
}

export function DemoNavRail({ persona, items }: DemoNavRailProps) {
  const { logoUrl, name } = useBrand();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname.startsWith(to);
  const current = PERSONAS.find((p) => p.id === persona) ?? PERSONAS[0];

  return (
    <nav
      className="flex h-screen w-56 shrink-0 flex-col gap-6 px-4 py-5"
      style={{ background: "var(--skin-surface2)", borderRight: "1px solid var(--skin-line)" }}
    >
      <Link to="/demo" aria-label={`${name} demo home`} className="px-1">
        <img src={logoUrl} alt={name} style={{ height: 26, objectFit: "contain" }} />
      </Link>

      <ul className="flex flex-1 flex-col gap-1">
        {items.map((item) => (
          <li key={item.to}>
            <Link
              to={item.to}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive(item.to, item.exact)
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          </li>
        ))}
      </ul>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-accent/50"
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
    </nav>
  );
}
