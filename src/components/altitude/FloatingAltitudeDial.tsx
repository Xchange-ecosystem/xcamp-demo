import React from 'react';
import { useAltitudeStore } from '../../store/altitudeStore';
import { ALTITUDE_META, type Altitude } from '../../entities/altitude';

export function FloatingAltitudeDial() {
  const { altitude, setAltitude } = useAltitudeStore();
  const meta = ALTITUDE_META[altitude];

  const cycle = () => {
    const next = ((altitude + 1) % 3) as Altitude;
    setAltitude(next);
  };

  // Each state uses a slightly darker shade in light mode (better contrast on
  // light backgrounds) and the standard shade in dark mode.
  const colors: Record<Altitude, string> = {
    0: 'bg-emerald-600 dark:bg-emerald-500',
    1: 'bg-teal-600 dark:bg-teal-500',
    2: 'bg-blue-600 dark:bg-blue-500',
  };

  return (
    <button
      onClick={cycle}
      title={`AI Altitude: ${meta.name} · ${meta.sub}\nClick to change`}
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-3 py-2 rounded-full text-white text-xs font-medium shadow-lg transition-all hover:scale-105 ${colors[altitude]}`}
    >
      <span className="opacity-80">{meta.sub}</span>
      <span className="w-px h-3 bg-white/30" />
      <span>{meta.name}</span>
    </button>
  );
}
