// Non-component constants for the composer input-mode pills, kept out of
// ComposerModes.tsx so that file only exports components (fast refresh).
import { FileText, Link2, Mic, Upload } from "lucide-react";
import type { InputMode } from "./ComposerModes";

export const MODE_PILLS: Array<{ id: InputMode; label: string; icon: typeof FileText }> = [
  { id: "text", label: "Text", icon: FileText },
  { id: "voice", label: "Voice", icon: Mic },
  { id: "upload", label: "Upload", icon: Upload },
  { id: "transcript", label: "Transcript", icon: FileText },
  { id: "agent", label: "Link agent", icon: Link2 },
];

export const MODE_HINTS: Record<InputMode, string> = {
  text: "Chi reads it, matches it to an objective, and proposes the work. You decide what lands.",
  voice: "Voice capture isn't wired up in this demo.",
  upload: "File analysis isn't wired up in this demo.",
  transcript:
    "Chi never reads what's typed or dropped here — this simulates an extraction for the demo.",
  agent: "Agent connections aren't wired up in this demo.",
};
