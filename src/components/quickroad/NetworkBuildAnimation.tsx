import { useEffect, useState } from "react";

interface Node {
  id: string;
  x: number;
  y: number;
  layer: number;
  delay: number;
  parentX: number;
  parentY: number;
}

// Build a diverging network: 1 center, then 3 layers radiating outward.
function buildNodes(): Node[] {
  const nodes: Node[] = [];
  const cx = 50;
  const cy = 50;
  const layerCounts = [6, 9, 12];
  const layerRadius = [16, 28, 40];
  let id = 0;

  layerCounts.forEach((count, layerIdx) => {
    const radius = layerRadius[layerIdx];
    const innerRadius = layerIdx === 0 ? 0 : layerRadius[layerIdx - 1];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + layerIdx * 0.4;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      const parentX = layerIdx === 0 ? cx : cx + Math.cos(angle) * innerRadius;
      const parentY = layerIdx === 0 ? cy : cy + Math.sin(angle) * innerRadius;
      nodes.push({
        id: `n${id++}`,
        x,
        y,
        layer: layerIdx,
        delay: layerIdx * 0.7 + i * 0.06,
        parentX,
        parentY,
      });
    }
  });
  return nodes;
}

export function NetworkBuildAnimation({ caption }: { caption?: string }) {
  const [nodes] = useState(buildNodes);
  const [tick, setTick] = useState(0);

  // Restart the wave loop so it keeps animating while we wait.
  useEffect(() => {
    const totalDuration = 4200;
    const t = setInterval(() => setTick((v) => v + 1), totalDuration);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-10">
      <div className="relative w-full" style={{ maxWidth: 320, aspectRatio: "1 / 1" }}>
        <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible" key={tick}>
          {/* connecting lines */}
          {nodes.map((n) => (
            <line
              key={`l-${n.id}`}
              x1={n.parentX}
              y1={n.parentY}
              x2={n.x}
              y2={n.y}
              stroke="var(--skin-accent)"
              strokeWidth={0.4}
              strokeLinecap="round"
              style={{
                opacity: 0,
                animation: `qrLineIn 0.6s ease-out ${n.delay}s forwards`,
              }}
            />
          ))}

          {/* outer nodes */}
          {nodes.map((n) => (
            <circle
              key={`c-${n.id}`}
              cx={n.x}
              cy={n.y}
              r={n.layer === 2 ? 1.6 : n.layer === 1 ? 2.1 : 2.6}
              fill="var(--skin-accent)"
              style={{
                opacity: 0,
                transformOrigin: `${n.x}px ${n.y}px`,
                animation: `qrNodeIn 0.5s ease-out ${n.delay}s forwards`,
              }}
            />
          ))}

          {/* central node with teal gradient + glow */}
          <defs>
            <radialGradient id="qrCenter" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--skin-accent)" />
              <stop offset="100%" stopColor="color-mix(in oklab, var(--skin-accent) 55%, #0a6b5c)" />
            </radialGradient>
          </defs>
          <circle cx={50} cy={50} r={7} fill="var(--skin-accent)" opacity={0.18}>
            <animate attributeName="r" values="6;9;6" dur="2.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.22;0.08;0.22" dur="2.4s" repeatCount="indefinite" />
          </circle>
          <circle cx={50} cy={50} r={4.5} fill="url(#qrCenter)" />
        </svg>
      </div>

      {caption && (
        <p className="mt-2 text-sm text-center" style={{ color: "var(--skin-ink-soft)" }}>
          {caption}
        </p>
      )}

      <style>{`
        @keyframes qrNodeIn {
          0% { opacity: 0; transform: scale(0); }
          60% { opacity: 1; transform: scale(1.25); }
          100% { opacity: 0.9; transform: scale(1); }
        }
        @keyframes qrLineIn {
          0% { opacity: 0; }
          100% { opacity: 0.35; }
        }
      `}</style>
    </div>
  );
}
