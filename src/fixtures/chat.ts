import type { ChatMessage } from "./types";

// Sample Companion chat transcript for the Investor Dashboard (P1.6) mock
// chat panel — a plausible investor/operator conversation with the
// Companion about portfolio state.
export const CHAT_MESSAGES: ChatMessage[] = [
  {
    id: "chat-1",
    role: "user",
    text: "Which portfolio project needs my attention this week?",
    timestamp: "2026-09-03T08:01:00.000Z",
  },
  {
    id: "chat-2",
    role: "assistant",
    text: "Northlight Robotics is the one to watch — performance is down 1.2% this period, though the offshore trial itself is going well (zero missed inspections in week 2). The dip is mostly rotor cost pressure. Everything else in your portfolio is trending flat or up.",
    timestamp: "2026-09-03T08:01:20.000Z",
  },
  {
    id: "chat-3",
    role: "user",
    text: "What's driving Loopwell Health's growth this month?",
    timestamp: "2026-09-03T08:02:10.000Z",
  },
  {
    id: "chat-4",
    role: "assistant",
    text: "Two things: the FDA 510(k) submission is on track for end of month, and they just signed their second pilot clinic. Quality score is 91%, the highest in your portfolio right now.",
    timestamp: "2026-09-03T08:02:35.000Z",
  },
  {
    id: "chat-5",
    role: "user",
    text: "Draft a short update I can send the fund about this week.",
    timestamp: "2026-09-03T08:03:40.000Z",
  },
  {
    id: "chat-6",
    role: "assistant",
    text: "Here's a draft: \"Portfolio update — Loopwell Health and Fernbase both had strong weeks (clinic #2 signed, RISC-V backend shipped). Northlight Robotics' offshore trial is performing well operationally, though we're watching rotor cost pressure on margins. No action needed elsewhere this week.\"",
    timestamp: "2026-09-03T08:04:05.000Z",
  },
];
