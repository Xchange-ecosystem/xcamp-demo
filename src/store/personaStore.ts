import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Persona = 'founder' | 'investor' | 'collaborator';

export const DEFAULT_PERSONA: Persona = 'founder';

interface PersonaStore {
  persona: Persona;
  setPersona: (p: Persona) => void;
}

export const usePersonaStore = create<PersonaStore>()(
  persist(
    (set) => ({
      persona: DEFAULT_PERSONA,
      setPersona: (persona) => set({ persona }),
    }),
    {
      name: 'nox-founder-persona',
    }
  )
);

// Convenience hook mirroring the shape the CompanionRail/home.tsx call sites want —
// { persona, setPersona } — without importing the raw Zustand store everywhere.
export function usePersona() {
  const persona = usePersonaStore((s) => s.persona);
  const setPersona = usePersonaStore((s) => s.setPersona);
  return { persona, setPersona };
}
