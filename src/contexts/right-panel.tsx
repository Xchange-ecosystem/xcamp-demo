import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export interface EntityPanelTarget {
  type: 'note' | 'task' | 'objective';
  id: string;
  objectiveId?: string;
  prefillText?: string;
  initialTitle?: string;
}

interface RightPanelCtx {
  entityTarget: EntityPanelTarget | null;
  openEntity: (target: EntityPanelTarget) => void;
  closeEntity: () => void;
}

const RightPanelContext = createContext<RightPanelCtx | null>(null);

export function RightPanelProvider({ children }: { children: ReactNode }) {
  const [entityTarget, setEntityTarget] = useState<EntityPanelTarget | null>(null);
  const openEntity = useCallback((t: EntityPanelTarget) => setEntityTarget(t), []);
  const closeEntity = useCallback(() => setEntityTarget(null), []);
  const ctx = useMemo(
    () => ({ entityTarget, openEntity, closeEntity }),
    [entityTarget, openEntity, closeEntity],
  );
  return <RightPanelContext.Provider value={ctx}>{children}</RightPanelContext.Provider>;
}

export function useRightPanel(): RightPanelCtx {
  const ctx = useContext(RightPanelContext);
  if (!ctx) throw new Error('useRightPanel must be used inside <RightPanelProvider>');
  return ctx;
}
