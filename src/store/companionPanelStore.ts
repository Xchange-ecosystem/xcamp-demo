import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PanelTab = 'items' | 'match' | 'actions';
export type ItemsSubtab = 'create' | 'updates';
export type MatchSubtab = 'resources' | 'connections';
export type ActionsSubtab = 'artefacts' | 'agents';

interface CompanionPanelStore {
  collapsed: boolean;
  width: number;
  activeTab: PanelTab;
  itemsSubtab: ItemsSubtab;
  matchSubtab: MatchSubtab;
  actionsSubtab: ActionsSubtab;
  setCollapsed: (v: boolean) => void;
  setWidth: (w: number) => void;
  setActiveTab: (t: PanelTab) => void;
  setItemsSubtab: (s: ItemsSubtab) => void;
  setMatchSubtab: (s: MatchSubtab) => void;
  setActionsSubtab: (s: ActionsSubtab) => void;
}

export const useCompanionPanelStore = create<CompanionPanelStore>()(
  persist(
    (set) => ({
      collapsed: false,
      width: 320,
      activeTab: 'items',
      itemsSubtab: 'create',
      matchSubtab: 'connections',
      actionsSubtab: 'artefacts',
      setCollapsed: (collapsed) => set({ collapsed }),
      setWidth: (width) => set({ width }),
      setActiveTab: (activeTab) => set({ activeTab }),
      setItemsSubtab: (itemsSubtab) => set({ itemsSubtab }),
      setMatchSubtab: (matchSubtab) => set({ matchSubtab }),
      setActionsSubtab: (actionsSubtab) => set({ actionsSubtab }),
    }),
    { name: 'nox-founder-companion-panel' }
  )
);
