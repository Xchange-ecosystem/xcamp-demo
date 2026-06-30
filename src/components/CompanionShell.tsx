import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/contexts/auth";
import { useBrand } from "@/lib/brand";

function CollapseOnMount() {
  const { state, toggleSidebar } = useSidebar();
  useEffect(() => {
    if (state === "expanded") toggleSidebar();
    // Only run on mount — intentional single-fire
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

export function CompanionShell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const brand = useBrand();

  // Clear the body background so the full-screen hero image shows through on mobile.
  // The body background-color in styles.css is correct for other routes but creates a
  // compositing-layer conflict with backdrop-filter on this route.
  useEffect(() => {
    document.body.style.backgroundColor = "transparent";
    return () => { document.body.style.removeProperty("background-color"); };
  }, []);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-4"
        style={{ color: "var(--skin-ink-soft)", background: "var(--skin-surface)" }}
      >
        <img src={brand.iconUrl} alt={brand.name} className="h-12 w-12 object-cover rounded-lg" />
        <h1 className="text-xl font-semibold" style={{ color: "var(--skin-ink)" }}>
          {brand.name}
        </h1>
      </div>
    );
  }

  return (
    <SidebarProvider
      defaultOpen={false}
      style={{ "--sidebar-width": "256px" } as React.CSSProperties}
    >
      <CollapseOnMount />
      <div className="flex min-h-screen w-full" style={{ background: "transparent" }}>
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
