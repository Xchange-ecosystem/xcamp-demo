import { useCallback, useRef } from "react";
import { ChevronRight, ChevronLeft, Layers, Network, Zap } from "lucide-react";
import { useCompanionPanelStore } from "@/store/companionPanelStore";
import { ItemsTab, type DynamixSuggestion } from "@/components/companion/ItemsTab";
import { MatchTab } from "@/components/companion/MatchTab";
import { ActionsTab } from "@/components/companion/ActionsTab";
import type { AICard } from "@xchange/client";
import type { PanelTab } from "@/store/companionPanelStore";

const CHAT_PANEL_WIDTH = "min(390px, 94vw)";
const MIN_WIDTH = 240;
const MAX_WIDTH = 540;

const TAB_CONFIG: { id: PanelTab; label: string; icon: React.ElementType }[] = [
  { id: 'items', label: 'Items', icon: Layers },
  { id: 'match', label: 'Match', icon: Network },
  { id: 'actions', label: 'Actions', icon: Zap },
];

interface CompanionSidePanelProps {
  cards: AICard[];
  dynamixSuggestions: DynamixSuggestion[];
  isAnswering: boolean;
  isPrefetching: boolean;
  onSuggestMore: () => void;
  onCardOpen: (card: AICard) => void;
  onCardDismiss: (card: AICard) => void;
  onDynamixOpen: (s: DynamixSuggestion) => void;
  onDynamixDismiss: (id: string) => void;
}

export function CompanionSidePanel({
  cards,
  dynamixSuggestions,
  isAnswering,
  isPrefetching,
  onSuggestMore,
  onCardOpen,
  onCardDismiss,
  onDynamixOpen,
  onDynamixDismiss,
}: CompanionSidePanelProps) {
  const {
    collapsed, setCollapsed,
    width, setWidth,
    activeTab, setActiveTab,
    itemsSubtab, setItemsSubtab,
    matchSubtab, setMatchSubtab,
    actionsSubtab, setActionsSubtab,
  } = useCompanionPanelStore();

  const dragStart = useRef<{ x: number; w: number } | null>(null);

  const onDragHandleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragStart.current = { x: e.clientX, w: width };

    const onMove = (ev: MouseEvent) => {
      if (!dragStart.current) return;
      const delta = dragStart.current.x - ev.clientX;
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, dragStart.current.w + delta));
      setWidth(newWidth);
    };

    const onUp = () => {
      dragStart.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [width, setWidth]);

  // Collapsed: show a thin vertical strip with rotated tab labels
  if (collapsed) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          bottom: 0,
          right: `calc(${CHAT_PANEL_WIDTH})`,
          width: 36,
          zIndex: 9,
          background: 'var(--glass-bg)',
          borderLeft: '1px solid var(--glass-border-color)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 20,
          cursor: 'pointer',
        }}
        onClick={() => setCollapsed(false)}
        title="Expand companion panel"
      >
        <button
          onClick={(e) => { e.stopPropagation(); setCollapsed(false); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--glass-text-soft)', padding: 4, marginBottom: 8 }}
          aria-label="Expand panel"
        >
          <ChevronLeft size={14} />
        </button>
        {TAB_CONFIG.map(({ id, label, icon: Icon }) => (
          <div
            key={id}
            onClick={(e) => { e.stopPropagation(); setActiveTab(id); setCollapsed(false); }}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              color: activeTab === id ? 'var(--skin-accent, #4de0c1)' : 'var(--glass-text-soft)',
              cursor: 'pointer',
            }}
            title={label}
          >
            <Icon size={13} />
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
              {label}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        bottom: 0,
        right: `calc(${CHAT_PANEL_WIDTH})`,
        width,
        zIndex: 9,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--glass-bg)',
        borderLeft: '1px solid var(--glass-border-color)',
        boxShadow: '-4px 0 20px rgba(0,0,0,0.18)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        color: 'var(--glass-text)',
        userSelect: dragStart.current ? 'none' : 'auto',
      }}
    >
      {/* Drag resize handle — left edge */}
      <div
        onMouseDown={onDragHandleMouseDown}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          cursor: 'ew-resize',
          zIndex: 1,
        }}
        aria-hidden
      />

      {/* Panel header — tabs + collapse button */}
      <div style={{
        flexShrink: 0,
        borderBottom: '1px solid var(--glass-divider, rgba(255,255,255,0.08))',
        padding: '10px 8px 0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--glass-text-soft)' }}>
            Companion
          </span>
          <button
            onClick={() => setCollapsed(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--glass-text-soft)', padding: 2, opacity: 0.7 }}
            aria-label="Collapse panel"
          >
            <ChevronRight size={13} />
          </button>
        </div>

        {/* Main tabs */}
        <div style={{ display: 'flex', gap: 0 }}>
          {TAB_CONFIG.map(({ id, label, icon: Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                style={{
                  flex: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  padding: '6px 4px 8px',
                  background: 'none',
                  border: 'none',
                  borderBottom: `2px solid ${active ? 'var(--skin-accent, #4de0c1)' : 'transparent'}`,
                  color: active ? 'var(--skin-accent, #4de0c1)' : 'var(--glass-text-soft)',
                  fontSize: 12,
                  fontWeight: active ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'color 0.15s, border-color 0.15s',
                }}
              >
                <Icon size={12} />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {activeTab === 'items' && (
          <ItemsTab
            cards={cards}
            dynamixSuggestions={dynamixSuggestions}
            isAnswering={isAnswering}
            isPrefetching={isPrefetching}
            subtab={itemsSubtab}
            onSubtabChange={setItemsSubtab}
            onSuggestMore={onSuggestMore}
            onCardOpen={onCardOpen}
            onCardDismiss={onCardDismiss}
            onDynamixOpen={onDynamixOpen}
            onDynamixDismiss={onDynamixDismiss}
          />
        )}
        {activeTab === 'match' && (
          <MatchTab
            subtab={matchSubtab}
            onSubtabChange={setMatchSubtab}
          />
        )}
        {activeTab === 'actions' && (
          <ActionsTab
            subtab={actionsSubtab}
            onSubtabChange={setActionsSubtab}
          />
        )}
      </div>
    </div>
  );
}
