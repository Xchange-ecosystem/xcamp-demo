import { create } from 'zustand';

interface FullscreenTaskStore {
  taskId: string | null;
  open: (id: string) => void;
  close: () => void;
}

export const useFullscreenTaskStore = create<FullscreenTaskStore>()((set) => ({
  taskId: null,
  open: (id) => set({ taskId: id }),
  close: () => set({ taskId: null }),
}));
