import type { AIWriteTool } from "./ai";

export type AuthRequirement =
  | "HARD_GATE"
  | "ELEVATED"
  | "ANNOTATED"
  | "LOW"
  | "NONE"
  | "NOT_EXECUTABLE";

// Maps every write tool to its authorization tier.
// HARD_GATE  — blocked entirely; requires out-of-band approval flow.
// NOT_EXECUTABLE — no backend execution path exists yet.
export const MCP_TOOL_AUTH_REQUIREMENTS: Record<AIWriteTool, AuthRequirement> = {
  promote_to_agreement: "HARD_GATE",
  accept_agreement: "HARD_GATE",
  add_project_member: "ELEVATED",
  assign_to_note: "ELEVATED",
  create_project: "ELEVATED",
  assign_user: "ELEVATED",
  initiate_completion: "ANNOTATED",
  record_completion_decision: "ANNOTATED",
  proof_note: "ANNOTATED",
  reference_note: "ANNOTATED",
  objective_draft: "ANNOTATED",
  update_project_description: "ANNOTATED",
  set_objective_fields: "ANNOTATED",
  set_timeframe: "LOW",
  manage_tags: "LOW",
  create_task: "LOW",
  complete_task: "LOW",
  add_note: "LOW",
  add_attachment: "LOW",
  link_notes: "LOW",
  navigate: "NONE",
  settle_objective: "NOT_EXECUTABLE",
  lock_value: "NOT_EXECUTABLE",
};

export interface ToolAuthResult {
  permitted: boolean;
  requirement: AuthRequirement;
  reason?: string;
}

export function checkToolAuth(tool: AIWriteTool): ToolAuthResult {
  const requirement = MCP_TOOL_AUTH_REQUIREMENTS[tool];
  switch (requirement) {
    case "HARD_GATE":
      return {
        permitted: false,
        requirement,
        reason: `Tool '${tool}' requires hard-gate authorization and cannot be executed via this path.`,
      };
    case "NOT_EXECUTABLE":
      return {
        permitted: false,
        requirement,
        reason: `Tool '${tool}' has no execution path and cannot be committed.`,
      };
    default:
      return { permitted: true, requirement };
  }
}
