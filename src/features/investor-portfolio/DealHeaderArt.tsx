import {
  Bot,
  Cloud,
  Cpu,
  HeartPulse,
  Leaf,
  Sparkles,
  Terminal,
  Wheat,
  type LucideIcon,
} from "lucide-react";
import type { Project } from "@/fixtures";

// Header art for Portfolio cards/sidepanel (session brief revision §3 & §6)
// — a generated gradient + large watermark icon keyed off the project's
// first tag, rather than hotlinked stock photography. Deliberate choice:
// this is a public, unauthenticated demo, and picking real stock-photo URLs
// risks broken links or hotlinking issues with no way to host real assets
// in this fixture-only repo. Every project already has a `color` and
// `tags`, so this needs no new fixture fields.
const TAG_ICON: Record<string, LucideIcon> = {
  climate: Leaf,
  hardware: Cpu,
  health: HeartPulse,
  AI: Sparkles,
  devtools: Terminal,
  robotics: Bot,
  food: Wheat,
  SaaS: Cloud,
};

function shade(hex: string, percent: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.max(0, ((n >> 16) & 0xff) + Math.round(255 * percent)));
  const g = Math.min(255, Math.max(0, ((n >> 8) & 0xff) + Math.round(255 * percent)));
  const b = Math.min(255, Math.max(0, (n & 0xff) + Math.round(255 * percent)));
  return `rgb(${r}, ${g}, ${b})`;
}

interface DealHeaderArtProps {
  project: Project;
  height?: number;
}

export function DealHeaderArt({ project, height = 96 }: DealHeaderArtProps) {
  const Icon = TAG_ICON[project.tags[0] ?? ""] ?? Sparkles;
  return (
    <div
      style={{
        position: "relative",
        height,
        overflow: "hidden",
        background: `linear-gradient(135deg, ${shade(project.color, 0.12)}, ${shade(project.color, -0.18)})`,
      }}
    >
      <Icon
        size={height * 1.1}
        strokeWidth={1.25}
        style={{
          position: "absolute",
          right: -height * 0.18,
          bottom: -height * 0.22,
          color: "rgba(255,255,255,0.35)",
        }}
        aria-hidden
      />
    </div>
  );
}
