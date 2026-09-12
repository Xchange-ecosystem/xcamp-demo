// src/components/demo/navigator/forceLayout.ts
//
// Self-contained force-directed layout (no new dependency — the repo has no
// d3-force or similar) for the Navigator Network view, to get the
// Obsidian/Kumu-style organic clustering the prior session's spec calls for
// rather than a purely radial layout. Deterministic: seeded on a circle
// (not Math.random), then a fixed number of repulsion/spring/gravity
// iterations — same input graph always settles to the same output
// positions.
export interface LayoutNode {
  id: string;
}

export interface LayoutEdge {
  source: string;
  target: string;
}

const REPULSION = 12000;
const SPRING_LENGTH = 160;
const SPRING_STRENGTH = 0.02;
const GRAVITY = 0.01;
const DAMPING = 0.85;
const ITERATIONS = 250;

export function computeForceLayout(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  center = { x: 500, y: 380 },
): Record<string, { x: number; y: number }> {
  const n = nodes.length;
  if (n === 0) return {};

  // Deterministic seed: evenly spaced on a circle.
  const positions = new Map<string, { x: number; y: number; vx: number; vy: number }>();
  nodes.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / n;
    const radius = 220;
    positions.set(node.id, {
      x: center.x + radius * Math.cos(angle),
      y: center.y + radius * Math.sin(angle),
      vx: 0,
      vy: 0,
    });
  });

  const edgeList = edges.filter((e) => positions.has(e.source) && positions.has(e.target));

  for (let iter = 0; iter < ITERATIONS; iter++) {
    // Repulsion — every pair of nodes pushes apart (Coulomb's-law-style).
    const ids = nodes.map((node) => node.id);
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = positions.get(ids[i])!;
        const b = positions.get(ids[j])!;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distSq = Math.max(dx * dx + dy * dy, 1);
        const dist = Math.sqrt(distSq);
        const force = REPULSION / distSq;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }
    }

    // Spring attraction along edges — pulls connected nodes toward a
    // resting edge length.
    for (const edge of edgeList) {
      const a = positions.get(edge.source)!;
      const b = positions.get(edge.target)!;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      const force = (dist - SPRING_LENGTH) * SPRING_STRENGTH;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      a.vx += fx;
      a.vy += fy;
      b.vx -= fx;
      b.vy -= fy;
    }

    // Gentle gravity toward center so disconnected/weakly-linked nodes
    // don't drift off to infinity.
    for (const pos of positions.values()) {
      pos.vx += (center.x - pos.x) * GRAVITY;
      pos.vy += (center.y - pos.y) * GRAVITY;
    }

    // Integrate + damp.
    for (const pos of positions.values()) {
      pos.vx *= DAMPING;
      pos.vy *= DAMPING;
      pos.x += pos.vx;
      pos.y += pos.vy;
    }
  }

  const result: Record<string, { x: number; y: number }> = {};
  positions.forEach((pos, id) => {
    result[id] = { x: pos.x, y: pos.y };
  });
  return result;
}
