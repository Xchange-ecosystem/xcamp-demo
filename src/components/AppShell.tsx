import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/contexts/auth";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ color: "var(--skin-ink-soft)" }}
      >
        Loading…
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full" style={{ background: "var(--skin-surface)" }}>
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header
            className="h-12 flex items-center px-2 shrink-0"
            style={{ borderBottom: "1px solid var(--skin-line)", background: "var(--skin-bg)" }}
          >
            <SidebarTrigger />
          </header>
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
