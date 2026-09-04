// Shell for the P1.1 Founder screens — wraps the real AppShell (auth-gated
// chrome, main sidebar) the way ProfileShell does, and adds its own
// secondary nav for the four Founder-persona destinations from the P1.1
// mockup (Home / Companion / Navigator / Dashboard). These are demo-only,
// mock-data-driven views distinct from the app's real /home, /navigator,
// etc. — see src/routes/founder*.tsx.
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, MessageCircle, Navigation as NavigationIcon, Home } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { getPersonById } from "@/fixtures/people";

// P1 demo persona — see P1.1 session report: fixtures have no notion of
// "the logged-in founder," so the Founder screens are built around one
// fixed fixture person (Maren Solberg, person-1) rather than the real
// authenticated user, consistent with "no production auth" for this screen.
const DEMO_FOUNDER = getPersonById("person-1")!;

const sections = [
  { to: "/demo/founder", label: "Home", icon: Home, exact: true },
  { to: "/demo/founder/companion", label: "Companion", icon: MessageCircle, exact: false },
  { to: "/demo/founder/navigator", label: "Navigator", icon: NavigationIcon, exact: false },
  { to: "/demo/founder/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: false },
] as const;

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function FounderShell() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (to: string, exact: boolean) =>
    exact ? pathname === to : pathname.startsWith(to);

  return (
    <AppShell>
      <div className="flex min-h-full w-full flex-col">
        <header
          className="flex flex-wrap items-center justify-between gap-3 px-6 py-3"
          style={{ borderBottom: "1px solid var(--skin-line)", background: "var(--skin-bg)" }}
        >
          <nav className="flex items-center gap-1 overflow-x-auto">
            {sections.map((s) => (
              <Link
                key={s.to}
                to={s.to}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors",
                  isActive(s.to, s.exact)
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                )}
              >
                <s.icon className="h-4 w-4" />
                {s.label}
              </Link>
            ))}
          </nav>

          <div
            className="flex items-center gap-2 rounded-full border px-2.5 py-1.5"
            style={{ borderColor: "var(--skin-line)" }}
          >
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-[10px]">
                {initials(DEMO_FOUNDER.displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="leading-tight">
              <div className="text-xs font-semibold text-foreground">
                {DEMO_FOUNDER.displayName}
              </div>
              <div className="text-[11px] text-muted-foreground">{DEMO_FOUNDER.title}</div>
            </div>
          </div>
        </header>

        <div className="flex-1 min-h-0">
          <Outlet />
        </div>
      </div>
    </AppShell>
  );
}

export { DEMO_FOUNDER };
