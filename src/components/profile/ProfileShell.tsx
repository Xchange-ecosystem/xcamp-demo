import { Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, User, Palette } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/AppShell";
import { cn } from "@/lib/utils";

const sections = [
  { to: "/profile", labelKey: "profile.account", icon: User, exact: true },
  { to: "/profile/appearance", labelKey: "profile.appearance", icon: Palette, exact: false },
] as const;

export function ProfileShell() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  const isActive = (to: string, exact: boolean) =>
    exact ? pathname === to : pathname.startsWith(to);

  return (
    <AppShell>
      <div className="flex min-h-full w-full flex-col md:flex-row">
        {/* Mobile top bar */}
        <div
          className="flex items-center gap-1 overflow-x-auto p-2 md:hidden"
          style={{ borderBottom: "1px solid var(--skin-line)", background: "var(--skin-bg)" }}
        >
          <button
            onClick={() => navigate({ to: "/" })}
            className="flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("nav.back")}
          </button>
          {sections.map((s) => (
            <Link
              key={s.to}
              to={s.to}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                isActive(s.to, s.exact)
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              )}
            >
              <s.icon className="h-4 w-4" />
              {t(s.labelKey)}
            </Link>
          ))}
        </div>

        {/* Profile sub-sidebar (desktop) */}
        <aside
          className="hidden w-56 shrink-0 flex-col gap-1 p-3 md:flex"
          style={{ borderRight: "1px solid var(--skin-line)", background: "var(--skin-bg)" }}
        >
          <button
            onClick={() => navigate({ to: "/" })}
            className="mb-3 flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("nav.back")}
          </button>
          <h2 className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("profile.title")}
          </h2>
          {sections.map((s) => (
            <Link
              key={s.to}
              to={s.to}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors",
                isActive(s.to, s.exact)
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              )}
            >
              <s.icon className="h-4 w-4" />
              {t(s.labelKey)}
            </Link>
          ))}
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0 p-4 sm:p-6 md:p-10">
          <div className="mx-auto w-full max-w-2xl">
            <Outlet />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
