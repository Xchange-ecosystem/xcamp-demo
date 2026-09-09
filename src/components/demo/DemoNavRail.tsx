// src/components/demo/DemoNavRail.tsx
import { type ComponentType, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronDown, ChevronsUpDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useBrand } from "@/lib/brand";
import { cn } from "@/lib/utils";

export type DemoPersona = "founder" | "investor" | "collaborator";

// A nav entry is either a leaf link (`to` set) or a group (`children` set,
// no `to` of its own) — groups can nest one level deep, which is as far as
// the current MicroApps/Logbook shape goes. Existing flat leaf arrays
// (investor, collaborator) satisfy this unchanged since they never set
// `children`.
export interface DemoNavItem {
  to?: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  exact?: boolean;
  children?: DemoNavItem[];
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

// Does any leaf under this entry match the current path? Used to keep a
// group expanded (and visually marked) while one of its children is open.
function containsActive(
  item: DemoNavItem,
  isActive: (to: string, exact?: boolean) => boolean,
): boolean {
  if (item.to) return isActive(item.to, item.exact);
  return (item.children ?? []).some((child) => containsActive(child, isActive));
}

function NavEntry({
  item,
  depth,
  isActive,
}: {
  item: DemoNavItem;
  depth: number;
  isActive: (to: string, exact?: boolean) => boolean;
}) {
  const active = containsActive(item, isActive);
  const [open, setOpen] = useState(true);

  if (item.children) {
    return (
      <li>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors",
            active ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground",
          )}
          style={{ paddingLeft: 12 + depth * 14 }}
        >
          {item.icon && <item.icon className="h-4 w-4 shrink-0" />}
          <span className="flex-1 truncate">{item.label}</span>
          <ChevronDown
            className={cn("h-3.5 w-3.5 shrink-0 transition-transform", !open && "-rotate-90")}
          />
        </button>
        {open && (
          <ul className="flex flex-col gap-1">
            {item.children.map((child) => (
              <NavEntry
                key={child.to ?? child.label}
                item={child}
                depth={depth + 1}
                isActive={isActive}
              />
            ))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <li>
      <Link
        to={item.to}
        className={cn(
          "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
          active
            ? "bg-accent text-accent-foreground font-medium"
            : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
        )}
        style={{ paddingLeft: 12 + depth * 14 }}
      >
        {item.icon && <item.icon className="h-4 w-4 shrink-0" />}
        {item.label}
      </Link>
    </li>
  );
}

export function DemoNavRail({ persona, items }: DemoNavRailProps) {
  const { logoUrl, name } = useBrand();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (to?: string, exact?: boolean) =>
    !!to && (exact ? pathname === to : pathname.startsWith(to));
  const current = PERSONAS.find((p) => p.id === persona) ?? PERSONAS[0];

  return (
    <nav
      className="flex h-screen w-56 shrink-0 flex-col gap-6 px-4 py-5"
      style={{ background: "var(--skin-surface2)", borderRight: "1px solid var(--skin-line)" }}
    >
      <Link to="/demo" aria-label={`${name} demo home`} className="px-1">
        <img src={logoUrl} alt={name} style={{ height: 26, objectFit: "contain" }} />
      </Link>

      <ul className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        {items.map((item) => (
          <NavEntry key={item.to ?? item.label} item={item} depth={0} isActive={isActive} />
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
