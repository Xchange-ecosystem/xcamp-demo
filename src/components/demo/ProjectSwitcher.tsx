// src/components/demo/ProjectSwitcher.tsx
// Founder-nav project switcher — visible on the Companion and Platform
// altitudes only (not App-style, which stays a disabled placeholder). Mocked
// with a single project (Solari Energy, DEMO_FOUNDER_PROJECT_ID) but built
// the same way as PersonaSwitcher (map over an options array) so adding more
// projects later is a data change, not a structural one. Selecting the
// current project is a no-op beyond showing it selected — Phase 0 found no
// existing project-scoping mechanism in the demo to wire this to.
import { ChevronsUpDown, FolderKanban } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { DEMO_FOUNDER_PROJECT_ID } from "@/fixtures/pitch";
import { getProjectById } from "@/fixtures/projects";

interface ProjectOption {
  id: string;
  name: string;
}

// Single seeded project today — DEMO_FOUNDER_PROJECT_ID stays the one source
// of truth for which project this is, so this list and the rest of the demo
// (CompanionInfoPanel, pitch fixtures) never drift apart.
const PROJECTS: ProjectOption[] = (() => {
  const project = getProjectById(DEMO_FOUNDER_PROJECT_ID);
  return project ? [{ id: project.id, name: project.name }] : [];
})();

interface ProjectSwitcherProps {
  className?: string;
}

export function ProjectSwitcher({ className }: ProjectSwitcherProps) {
  const current = PROJECTS[0];
  if (!current) return null;

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
          <span className="flex items-center gap-2 truncate font-medium text-foreground">
            <FolderKanban className="h-4 w-4 shrink-0 text-muted-foreground" />
            {current.name}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[13rem]">
        {PROJECTS.map((project) => (
          <DropdownMenuItem key={project.id} disabled={project.id === current.id}>
            {project.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
