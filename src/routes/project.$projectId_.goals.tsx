import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeroShell } from "@/components/PageHeroShell";
import { AppLogo } from "@/components/AppLogo";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth";
import { GoalsFeed } from "@/components/goals/GoalsFeed";

export const Route = createFileRoute("/project/$projectId_/goals")({
  head: () => ({
    meta: [{ title: "My Goals — Xcamp" }],
  }),
  component: GoalsPage,
});

interface ProjectHeader {
  title: string;
  description: string | null;
}

function GoalsPage() {
  const { projectId } = Route.useParams();
  const { user } = useAuth();

  const [project, setProject] = useState<ProjectHeader | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    supabase
      .from("projects")
      .select("title, description")
      .eq("id", projectId)
      .single()
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err || !data) {
          setError("Could not load project.");
          setLoading(false);
          return;
        }
        setProject({ title: data.title ?? "", description: data.description ?? null });
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (loading || !user) {
    return (
      <AppShell>
        <div
          className="flex items-center justify-center min-h-screen"
          style={{ background: "var(--skin-surface)" }}
        >
          <Loader2 size={24} className="animate-spin" style={{ color: "var(--skin-accent)" }} />
        </div>
      </AppShell>
    );
  }

  if (error || !project) {
    return (
      <AppShell>
        <div
          className="flex items-center justify-center min-h-screen"
          style={{ background: "var(--skin-surface)" }}
        >
          <p style={{ color: "var(--skin-ink-soft)" }}>{error ?? "Project not found."}</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeroShell
        seed={projectId}
        logo={<AppLogo collapsed={true} />}
        eyebrow="Project"
        title="My Goals"
        subtitle={project.title}
      >
        <div className="px-4 sm:px-5 pb-6 pt-3">
          <GoalsFeed
            user={user}
            projectId={projectId}
            projectTitle={project.title}
            projectDescription={project.description}
          />
        </div>
      </PageHeroShell>
    </AppShell>
  );
}
