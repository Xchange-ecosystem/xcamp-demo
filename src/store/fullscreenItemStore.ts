import { create } from "zustand";

// Dispatcher-level store: tracks which note/task is requested for fullscreen,
// independent of `useFullscreenTaskStore` (owned by TaskFullscreenModal, the
// component being actively rebuilt in a parallel session — see PR #103). This
// store drives that one only through its existing open()/close() API, never
// its internals. See FullscreenDispatcher.

interface FullscreenItem {
  id: string;
  noteType: string;
}

interface FullscreenItemStore {
  item: FullscreenItem | null;
  open: (id: string, noteType: string) => void;
  close: () => void;
}

export const useFullscreenItemStore = create<FullscreenItemStore>()((set) => ({
  item: null,
  open: (id, noteType) => set({ item: { id, noteType } }),
  close: () => set({ item: null }),
}));
