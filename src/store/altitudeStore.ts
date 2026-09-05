import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Altitude } from "../entities/altitude";
import { DEFAULT_ALTITUDE } from "../entities/altitude";

interface AltitudeStore {
  altitude: Altitude;
  setAltitude: (a: Altitude) => void;
}

export const useAltitudeStore = create<AltitudeStore>()(
  persist(
    (set) => ({
      altitude: DEFAULT_ALTITUDE,
      setAltitude: (altitude) => set({ altitude }),
    }),
    {
      name: "nox-founder-altitude",
    },
  ),
);
