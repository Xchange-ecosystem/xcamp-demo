/**
 * Vox Companion Card Renderer
 * @xchange/companion — Card stack component for Xcamp Vox AI suggestions
 *
 * Colors are entirely driven by CSS custom properties from the host's active
 * skin. No hardcoded hex values. The host must inject --skin-* and --gravity-*
 * tokens (via applySkin / SkinProvider) before this component renders.
 */

import React, { useState, useEffect, useRef } from 'react';
import { applySkin, resolveSkin } from '@xchange/ui';
import type { SkinConfig } from '@xchange/ui';

/* ============================================================================
   Type Definitions
   ============================================================================ */

export interface AICard {
  id: string;
  kind: 'content' | 'action_item' | 'urgency' | 'opportunity' | 'metric' | 'celebration' | 'update' | 'web_result';
  title: string;
  body: string;
  dismissible?: boolean;
  confirmable?: boolean;
}

export interface VoxReply {
  reply_markdown: string;
  cards: AICard[];
}

export type ProposalStatus = {
  status: 'pending' | 'success' | 'error';
  message?: string;
};

export interface CompanionCardStackProps {
  cards: AICard[];
  replyMarkdown?: string;
  onDismiss?: (cardId: string) => void;
  onConfirm?: (cardId: string) => void;
  isLoading?: boolean;
  proposalResults?: Record<string, ProposalStatus>;
  /** 0 = Glide, 1 = Cruise, 2 = Cockpit. At altitude 0, confirmable cards show Accept only (no Dismiss). */
  altitude?: 0 | 1 | 2;
  /**
   * When provided, applySkin() is called scoped to this component's wrapper
   * element instead of document.documentElement. Harness / standalone escape hatch.
   * When absent, the component reads whatever CSS vars the host has already injected.
   */
  skinConfig?: SkinConfig;
}

/* ============================================================================
   Kind → CSS accent variable mapping
   ============================================================================ */

const KIND_ACCENT: Record<AICard['kind'], string> = {
  content:     'var(--skin-accent)',
  action_item: 'var(--gravity-border)',
  urgency:     'var(--skin-warn)',
  opportunity: 'var(--skin-accent-cool)',
  metric:      'var(--skin-good)',
  celebration: 'var(--skin-accent-warm)',
  update:      'var(--skin-line)',
  web_result:  'var(--skin-line)',
};

/* ============================================================================
   Injected stylesheet — all colors via CSS vars, no hex
   ============================================================================ */

const COMPONENT_STYLES = `
  .xcc-root {
    background: var(--skin-bg);
    min-height: 100vh;
    padding: 16px;
    font-family: system-ui, sans-serif;
  }
  .xcc-banner {
    border-top: 1px solid var(--skin-line);
    background: var(--skin-surface);
    padding: 12px 16px;
    margin-bottom: 16px;
    border-radius: var(--skin-radius);
    font-size: 13px;
    line-height: 1.5;
    color: var(--skin-ink-soft);
    font-family: system-ui, sans-serif;
    white-space: pre-wrap;
    word-wrap: break-word;
  }
  .xcc-card {
    background: var(--skin-surface);
    border: 1px solid var(--skin-line);
    border-left: 3px solid var(--xcc-accent);
    border-radius: var(--skin-radius);
    padding: 16px;
    margin-bottom: 12px;
    position: relative;
    font-family: system-ui, sans-serif;
    transition: all 200ms ease;
  }
  .xcc-card--gravity {
    background: var(--gravity-bg);
    border-color: var(--gravity-border);
    border-left-color: var(--gravity-border);
  }
  .xcc-card__badge {
    position: absolute;
    top: 12px;
    left: 16px;
    font-size: 10px;
    font-family: monospace;
    font-weight: 500;
    letter-spacing: 0.05em;
    color: var(--skin-ink-faint);
    text-transform: uppercase;
  }
  .xcc-card__dismiss {
    position: absolute;
    top: 12px;
    right: 12px;
    background: none;
    border: none;
    color: var(--skin-ink-soft);
    font-size: 18px;
    cursor: pointer;
    padding: 4px 8px;
    line-height: 1;
    transition: color 150ms ease;
  }
  .xcc-card__dismiss:hover { color: var(--skin-ink); }
  .xcc-card__title {
    font-size: 14px;
    font-weight: 600;
    color: var(--skin-ink);
    margin-bottom: 8px;
    margin-top: 24px;
    line-height: 1.35;
  }
  .xcc-card__body {
    font-size: 13px;
    color: var(--skin-ink-soft);
    line-height: 1.5;
    white-space: pre-wrap;
    word-wrap: break-word;
  }
  .xcc-card__status {
    font-size: 12px;
    margin-top: 8px;
  }
  .xcc-card__status--pending { color: var(--skin-ink-faint); }
  .xcc-card__status--success { color: var(--skin-good); }
  .xcc-card__status--error   { color: var(--skin-warn); }
  .xcc-card__actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 4px;
  }
  .xcc-card__accept {
    background: var(--xcc-accent);
    color: var(--skin-bg);
    border: none;
    border-radius: var(--skin-radius);
    padding: 8px 16px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: opacity 150ms ease;
  }
  .xcc-card__accept--gravity { color: var(--gravity-ink); }
  .xcc-card__accept:disabled {
    background: var(--skin-ink-faint);
    cursor: not-allowed;
    opacity: 0.6;
  }
  .xcc-card__accept:not(:disabled):hover { opacity: 0.9; }
  .xcc-skeleton {
    background: var(--skin-surface);
    border: 1px solid var(--skin-line);
    border-radius: var(--skin-radius);
    padding: 16px;
    margin-bottom: 12px;
    height: 120px;
    animation: xcc-pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
  .xcc-empty {
    text-align: center;
    padding: 32px 16px;
    color: var(--skin-ink-faint);
    font-size: 13px;
    font-family: system-ui, sans-serif;
  }
  @keyframes xcc-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;

/* ============================================================================
   Sub-components
   ============================================================================ */

interface ReplyBannerProps {
  markdown: string;
}

const ReplyBanner: React.FC<ReplyBannerProps> = ({ markdown }) => (
  <div className="xcc-banner">{markdown}</div>
);

interface CardProps {
  card: AICard;
  altitude: 0 | 1 | 2;
  onDismiss: (id: string) => void;
  onConfirm: (id: string) => void;
  proposalResult?: ProposalStatus;
}

const Card: React.FC<CardProps> = ({ card, altitude, onDismiss, onConfirm, proposalResult }) => {
  const isGravity = card.kind === 'action_item' && card.confirmable;
  const accentVar = KIND_ACCENT[card.kind];
  const isPending = proposalResult?.status === 'pending';

  // At altitude 0 (Glide), confirmable cards suppress the dismiss button
  const showDismiss = card.dismissible && !(altitude === 0 && card.confirmable);

  return (
    <div
      className={`xcc-card${isGravity ? ' xcc-card--gravity' : ''}`}
      style={{ '--xcc-accent': accentVar } as React.CSSProperties}
    >
      <div className="xcc-card__badge">{card.kind}</div>

      {showDismiss && (
        <button
          className="xcc-card__dismiss"
          onClick={() => onDismiss(card.id)}
          aria-label={`Dismiss "${card.title}"`}
        >
          ×
        </button>
      )}

      <div
        className="xcc-card__title"
        style={{ marginRight: showDismiss ? '32px' : '0' }}
      >
        {card.title}
      </div>

      <div
        className="xcc-card__body"
        style={{ marginBottom: card.confirmable ? '12px' : '0' }}
      >
        {card.body}
      </div>

      {proposalResult && (
        <div
          className={`xcc-card__status xcc-card__status--${proposalResult.status}`}
          style={{ marginBottom: card.confirmable ? '8px' : '0' }}
        >
          {proposalResult.status === 'pending' && 'Executing…'}
          {proposalResult.status === 'success' && `✓ Done${proposalResult.message ? ` · ${proposalResult.message}` : ''}`}
          {proposalResult.status === 'error' && `✗ ${proposalResult.message ?? 'Error'}`}
        </div>
      )}

      {card.confirmable && (
        <div className="xcc-card__actions">
          <button
            className={`xcc-card__accept${isGravity ? ' xcc-card__accept--gravity' : ''}`}
            onClick={() => !isPending && onConfirm(card.id)}
            disabled={isPending}
            aria-label={`Accept "${card.title}"`}
          >
            {isPending ? 'Executing…' : 'Accept'}
          </button>
        </div>
      )}
    </div>
  );
};

const SkeletonCard: React.FC = () => <div className="xcc-skeleton" />;

const EmptyState: React.FC = () => (
  <div className="xcc-empty">Vox has no suggestions right now</div>
);

/* ============================================================================
   Main Component
   ============================================================================ */

export const CompanionCardStack: React.FC<CompanionCardStackProps> = ({
  cards,
  replyMarkdown,
  onDismiss = () => {},
  onConfirm = () => {},
  isLoading = false,
  proposalResults = {},
  altitude = 1,
  skinConfig,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [visibleCardIds, setVisibleCardIds] = useState<Set<string>>(
    new Set(cards.map((c) => c.id))
  );

  // Apply skin scoped to this element when skinConfig is provided
  useEffect(() => {
    if (skinConfig && wrapperRef.current) {
      applySkin(resolveSkin(skinConfig), wrapperRef.current);
    }
  }, [skinConfig]);

  const handleDismiss = (cardId: string) => {
    setVisibleCardIds((prev) => {
      const next = new Set(prev);
      next.delete(cardId);
      return next;
    });
    onDismiss(cardId);
  };

  const handleConfirm = (cardId: string) => {
    if (Object.keys(proposalResults).length === 0 && !proposalResults[cardId]) {
      setVisibleCardIds((prev) => {
        const next = new Set(prev);
        next.delete(cardId);
        return next;
      });
    }
    onConfirm(cardId);
  };

  const filteredCards = cards.filter((c) => visibleCardIds.has(c.id));

  return (
    <div ref={wrapperRef} className="xcc-root">
      <style>{COMPONENT_STYLES}</style>

      {replyMarkdown && <ReplyBanner markdown={replyMarkdown} />}

      {isLoading && (
        <div>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {!isLoading && filteredCards.length > 0 && (
        <div>
          {filteredCards.map((card) => (
            <Card
              key={card.id}
              card={card}
              altitude={altitude}
              onDismiss={handleDismiss}
              onConfirm={handleConfirm}
              proposalResult={proposalResults[card.id]}
            />
          ))}
        </div>
      )}

      {!isLoading && filteredCards.length === 0 && !replyMarkdown && <EmptyState />}
    </div>
  );
};

export default CompanionCardStack;
