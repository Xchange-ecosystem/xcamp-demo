import type { LucideIcon } from "lucide-react";
import { Info, NotebookPen, Users, Link2, Zap, CheckCircle2 } from "lucide-react";

export type TaskTabKey =
  | "about"
  | "do-document"
  | "match-collaborate"
  | "linked-items"
  | "actions-artifacts"
  | "review-complete";

export interface TaskTabDef {
  key: TaskTabKey;
  label: string;
  icon: LucideIcon;
  /** Actions & Artifacts / Review & Complete — mockup shows these as "coming soon". */
  inactive?: boolean;
}

export const TASK_TABS: TaskTabDef[] = [
  { key: "about", label: "About this Task", icon: Info },
  { key: "do-document", label: "Do & Document", icon: NotebookPen },
  { key: "match-collaborate", label: "Match & Collaborate", icon: Users },
  { key: "linked-items", label: "Linked Items", icon: Link2 },
  { key: "actions-artifacts", label: "Actions & Artifacts", icon: Zap, inactive: true },
  { key: "review-complete", label: "Review & Complete", icon: CheckCircle2, inactive: true },
];
