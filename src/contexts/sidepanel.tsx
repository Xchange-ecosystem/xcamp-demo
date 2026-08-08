import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { ItemKind } from "@/lib/sidepanel-service";

export interface PanelItem {
  id: string;
  kind: ItemKind;
  title?: string;
  noteType?: string;
}

interface SidepanelCtx {
  /** Open the panel at a new root item (resets history). */
  open: (item: PanelItem) => void;
  /** Push a new item onto the navigation stack (internal panel navigation). */
  push: (item: PanelItem) => void;
  /** Pop the top item from the stack (back arrow). */
  pop: () => void;
  /** Close the panel and clear the stack. */
  close: () => void;
  /** Navigate back to a specific index in the stack (breadcrumb click). */
  goTo: (index: number) => void;
  stack: PanelItem[];
  isOpen: boolean;
  current: PanelItem | null;
}

const SidepanelContext = createContext<SidepanelCtx | null>(null);

export function SidepanelProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<PanelItem[]>([]);

  const open = useCallback((item: PanelItem) => setStack([item]), []);
  const push = useCallback((item: PanelItem) => setStack((s) => [...s, item]), []);
  const pop = useCallback(() => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)), []);
  const close = useCallback(() => setStack([]), []);
  const goTo = useCallback((index: number) => setStack((s) => s.slice(0, index + 1)), []);

  const current = stack.length > 0 ? stack[stack.length - 1] : null;
  const isOpen = stack.length > 0;

  const ctx = useMemo(
    () => ({ open, push, pop, close, goTo, stack, isOpen, current }),
    [open, push, pop, close, goTo, stack, isOpen, current],
  );

  return <SidepanelContext.Provider value={ctx}>{children}</SidepanelContext.Provider>;
}

export function useSidepanel(): SidepanelCtx {
  const ctx = useContext(SidepanelContext);
  if (!ctx) throw new Error("useSidepanel must be used inside <SidepanelProvider>");
  return ctx;
}
