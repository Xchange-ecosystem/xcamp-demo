import { Loader2, Plus, RefreshCw, X, ChevronRight } from "lucide-react";
import type { AICard } from "@xchange/client";
import type { ItemsSubtab } from "@/store/companionPanelStore";

export interface DynamixSuggestion {
  id: string;
  title: string;
  suggestion_type: string;
  rationale: string | null;
  priority: string | null;
  objective_id: string | null;
  note_id: string | null;
  kind: string | null;
  status: string;
}

interface ItemsTabProps {
  cards: AICard[];
  dynamixSuggestions: DynamixSuggestion[];
  isAnswering: boolean;
  isPrefetching: boolean;
  subtab: ItemsSubtab;
  onSubtabChange: (s: ItemsSubtab) => void;
  onSuggestMore: () => void;
  onCardOpen: (card: AICard) => void;
  onCardDismiss: (card: AICard) => void;
  onDynamixOpen: (s: DynamixSuggestion) => void;
  onDynamixDismiss: (id: string) => void;
}

const CREATE_KINDS = new Set(['action_item', 'task']);
const UPDATE_KINDS = new Set(['update']);

function kindLabel(kind: AICard['kind']): string {
  switch (kind) {
    case 'action_item': return 'Action';
    case 'task': return 'Task';
    case 'update': return 'Update';
    default: return kind;
  }
}

function priorityColor(p: string | null): string {
  if (!p) return 'var(--skin-ink-faint, #6b7280)';
  switch (p.toLowerCase()) {
    case 'high': return '#dc2626';
    case 'medium': return '#d97706';
    default: return 'var(--skin-ink-faint, #6b7280)';
  }
}

function AICardItem({ card, onOpen, onDismiss }: { card: AICard; onOpen: () => void; onDismiss: () => void }) {
  return (
    <div
      style={{
        background: 'var(--glass-card-bg, rgba(255,255,255,0.06))',
        border: '1px solid var(--glass-border-color, rgba(255,255,255,0.1))',
        borderRadius: 8,
        padding: '11px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <span style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--skin-accent, #4de0c1)',
            flexShrink: 0,
          }}>
            {kindLabel(card.kind)}
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--glass-text)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {card.title}
          </span>
        </div>
        <button
          onClick={onDismiss}
          aria-label="Dismiss card"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--glass-text-soft)', padding: 2, flexShrink: 0, opacity: 0.6, lineHeight: 1 }}
        >
          <X size={12} />
        </button>
      </div>

      {card.body && (
        <p style={{ fontSize: 12, color: 'var(--glass-text-soft)', margin: 0, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {card.body}
        </p>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={onOpen}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 11, fontWeight: 600,
            color: 'var(--skin-accent, #4de0c1)',
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          }}
        >
          Open <ChevronRight size={11} />
        </button>
      </div>
    </div>
  );
}

function DynamixItem({ s, onOpen, onDismiss }: { s: DynamixSuggestion; onOpen: () => void; onDismiss: () => void }) {
  return (
    <div
      style={{
        background: 'var(--glass-card-bg, rgba(255,255,255,0.04))',
        border: '1px solid var(--glass-border-color, rgba(255,255,255,0.08))',
        borderRadius: 8,
        padding: '11px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--skin-ink-soft)', flexShrink: 0 }}>
              {s.suggestion_type}
            </span>
            {s.priority && (
              <span style={{ fontSize: 9, fontWeight: 600, color: priorityColor(s.priority), textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {s.priority}
              </span>
            )}
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--glass-text)', lineHeight: 1.3 }}>
            {s.title}
          </span>
        </div>
        <button
          onClick={onDismiss}
          aria-label="Dismiss suggestion"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--glass-text-soft)', padding: 2, flexShrink: 0, opacity: 0.6, lineHeight: 1 }}
        >
          <X size={12} />
        </button>
      </div>

      {s.rationale && (
        <p style={{ fontSize: 12, color: 'var(--glass-text-soft)', margin: 0, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {s.rationale}
        </p>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={onOpen}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 11, fontWeight: 600,
            color: 'var(--skin-accent, #4de0c1)',
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          }}
        >
          Open <ChevronRight size={11} />
        </button>
      </div>
    </div>
  );
}

export function ItemsTab({
  cards,
  dynamixSuggestions,
  isAnswering,
  isPrefetching,
  subtab,
  onSubtabChange,
  onSuggestMore,
  onCardOpen,
  onCardDismiss,
  onDynamixOpen,
  onDynamixDismiss,
}: ItemsTabProps) {
  const isCreate = subtab === 'create';

  const visibleCards = cards.filter((c) =>
    isCreate ? CREATE_KINDS.has(c.kind) : UPDATE_KINDS.has(c.kind)
  );

  const visibleDynamix = dynamixSuggestions.filter((s) => {
    const t = s.suggestion_type?.toLowerCase() ?? '';
    return isCreate ? !t.includes('update') : t.includes('update');
  });

  const isEmpty = visibleCards.length === 0 && visibleDynamix.length === 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* Subtab pills */}
      <div style={{ display: 'flex', gap: 4, padding: '10px 12px 8px', flexShrink: 0 }}>
        {(['create', 'updates'] as ItemsSubtab[]).map((s) => (
          <button
            key={s}
            onClick={() => onSubtabChange(s)}
            style={{
              padding: '4px 12px',
              borderRadius: 999,
              border: '1px solid',
              borderColor: subtab === s ? 'var(--skin-accent, #4de0c1)' : 'var(--glass-border-color, rgba(255,255,255,0.12))',
              background: subtab === s ? 'rgba(77,224,193,0.15)' : 'transparent',
              color: subtab === s ? 'var(--skin-accent, #4de0c1)' : 'var(--glass-text-soft)',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {s === 'create' ? 'Create' : 'Updates'}
          </button>
        ))}
      </div>

      {/* Card list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(isAnswering || isPrefetching) && isEmpty && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--glass-text-soft)', fontSize: 12, padding: '20px 0' }}>
            <Loader2 size={14} className="animate-spin" />
            {isAnswering ? 'Chi is thinking…' : 'Loading suggestions…'}
          </div>
        )}

        {!isAnswering && !isPrefetching && isEmpty && (
          <div style={{ fontSize: 12, color: 'var(--glass-text-soft)', padding: '20px 0', textAlign: 'center', lineHeight: 1.6 }}>
            {isCreate
              ? 'No create suggestions yet. Ask Chi about your project to get started.'
              : 'No updates suggested yet.'}
          </div>
        )}

        {visibleCards.map((card) => (
          <AICardItem
            key={`${card.kind}::${card.title}`}
            card={card}
            onOpen={() => onCardOpen(card)}
            onDismiss={() => onCardDismiss(card)}
          />
        ))}

        {isAnswering && !isEmpty && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--glass-text-soft)', fontSize: 12, padding: '4px 2px' }}>
            <Loader2 size={12} className="animate-spin" />
            <span>Refreshing…</span>
          </div>
        )}

        {visibleDynamix.length > 0 && (
          <>
            {visibleCards.length > 0 && (
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--glass-text-soft)', padding: '4px 2px', opacity: 0.7 }}>
                Project suggestions
              </div>
            )}
            {visibleDynamix.map((s) => (
              <DynamixItem
                key={s.id}
                s={s}
                onOpen={() => onDynamixOpen(s)}
                onDismiss={() => onDynamixDismiss(s.id)}
              />
            ))}
          </>
        )}

        {isPrefetching && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--glass-text-soft)', fontSize: 12, padding: '4px 2px' }}>
            <Loader2 size={12} className="animate-spin" />
            <span>Loading project suggestions…</span>
          </div>
        )}
      </div>

      {/* Suggest more footer */}
      <div style={{ flexShrink: 0, padding: '10px 12px', borderTop: '1px solid var(--glass-divider, rgba(255,255,255,0.08))' }}>
        <button
          onClick={onSuggestMore}
          disabled={isAnswering}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            width: '100%',
            padding: '7px 0',
            borderRadius: 6,
            border: '1px solid var(--glass-border-color, rgba(255,255,255,0.12))',
            background: 'transparent',
            color: isAnswering ? 'var(--glass-text-soft)' : 'var(--glass-text)',
            fontSize: 12,
            fontWeight: 500,
            cursor: isAnswering ? 'not-allowed' : 'pointer',
            opacity: isAnswering ? 0.5 : 1,
          }}
        >
          <Plus size={12} />
          Suggest more
        </button>
      </div>
    </div>
  );
}
