import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/contexts/auth";
import { useBrand } from "@/lib/brand";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const brand = useBrand();

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
          {brand.name} App
        </h1>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full" style={{ background: "var(--skin-surface)" }}>
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
