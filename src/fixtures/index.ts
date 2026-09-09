// Shared P1 mock-data layer — single entry point.
//
// Import from "@/fixtures" rather than reaching into individual files, so
// every screen goes through the same typed access layer instead of raw
// arrays scattered across components:
//
//   import { PEOPLE, getProjectById, getFeedByKind } from "@/fixtures";
//
// See README.md in this directory for the full entity list and how the P1
// screens (Founder, Investor/Operator, Investor Dashboard, Collaborator,
// Admin) map onto it.

export * from "./types";
export * from "./people";
export * from "./projects";
export * from "./objectives";
export * from "./metrics";
export * from "./portfolio";
export * from "./feed";
export * from "./transcripts";
export * from "./chat";
export * from "./wallet";
export * from "./assignments";
export * from "./pitch";
