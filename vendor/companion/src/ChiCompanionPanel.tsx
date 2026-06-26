import React, { useEffect, useRef, useState } from 'react';
import { answerWithContext, executeProposal, getSessionToken } from '@xchange/client';
import type { AICard, Altitude } from '@xchange/client';
import { CompanionCardStack } from './components/CompanionCardStack';
import type { ProposalStatus } from './components/CompanionCardStack';

// ─── Public types ─────────────────────────────────────────────────────────────

export interface ChiContext {
  projectId?: string;
  objectiveId?: string;
  taskId?: string;
  projectLabel?: string;
  objectiveLabel?: string;
  taskLabel?: string;
}

export interface ProposalResult {
  ok: boolean;
  error?: string;
}

/** Escape hatch for standalone theming; no design-system package required */
export interface SkinConfig {
  [cssVar: string]: string;
}

export interface ChiCompanionPanelProps {
  /** Required for Vox calls */
  tenantId: string;
  userId: string;

  /** Scope for Vox */
  context?: ChiContext;
  onContextChange?: (level: 'project' | 'objective' | 'task', id: string) => void;

  /** Altitude */
  altitude?: Altitude;
  onAltitudeChange?: (alt: Altitude) => void;

  /** Optional escape hatch for standalone use */
  skinConfig?: SkinConfig;

  /** Card lifecycle callbacks for host app */
  onCardAccept?: (card: AICard, result: ProposalResult) => void;
  onCardDismiss?: (card: AICard) => void;

  className?: string;
  style?: React.CSSProperties;
}

// ─── Internal types ───────────────────────────────────────────────────────────

type Message = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  cards?: AICard[];
  // Stored as ProposalStatus to match CompanionCardStack; converted to ProposalResult for external callbacks
  cardStatuses?: Record<string, ProposalStatus>;
  timestamp: Date;
};

// ─── Mention options ──────────────────────────────────────────────────────────

// TODO: allow host to extend via a mentionOptions prop
const MENTION_OPTIONS = [
  { token: 'Project', icon: '📁', label: 'Project' },
  { token: 'Objective', icon: '🎯', label: 'Objective' },
  { token: 'Task', icon: '📝', label: 'Task/Note' },
  { token: 'User', icon: '👤', label: 'User' },
];

// ─── CSS — all colors via CSS vars, zero hex ──────────────────────────────────

const PANEL_STYLES = `
.chi-companion-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  font-family: var(--skin-font-body, system-ui, sans-serif);
  background: var(--skin-bg);
  color: var(--skin-ink);
  border-radius: var(--skin-radius);
  overflow: hidden;
  position: relative;
}
.chi-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid var(--skin-line);
  flex-shrink: 0;
}
.chi-title {
  font-weight: 700;
  font-size: 14px;
  color: var(--skin-ink);
}
.chi-altitude-dots {
  display: flex;
  align-items: center;
  gap: 6px;
}
.chi-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--skin-line);
  cursor: pointer;
  display: inline-block;
  transition: background 150ms;
}
.chi-dot--active {
  background: var(--skin-accent);
}
.chi-avatar-dot {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--skin-accent);
  color: var(--skin-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  flex-shrink: 0;
}
.chi-context-bar {
  padding: 6px 14px;
  border-bottom: 1px solid var(--skin-line);
  background: var(--skin-surface2);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.chi-context-label {
  font-size: 10px;
  color: var(--skin-ink-soft);
  letter-spacing: 0.04em;
}
.chi-breadcrumb {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}
.chi-crumb {
  background: none;
  border: none;
  color: var(--skin-accent);
  font-size: 12px;
  cursor: pointer;
  padding: 0;
  font-family: inherit;
}
.chi-crumb:hover { text-decoration: underline; }
.chi-crumb-sep {
  color: var(--skin-ink-soft);
  font-size: 12px;
}
.chi-chat {
  flex: 1;
  overflow-y: auto;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.chi-greeting {
  color: var(--skin-ink-soft);
  font-style: italic;
  font-size: 13px;
  text-align: center;
  margin: auto 0;
}
.chi-msg {
  display: flex;
  flex-direction: column;
  max-width: 85%;
}
.chi-msg--user {
  align-self: flex-end;
  max-width: 75%;
}
.chi-msg--user .chi-msg-text {
  background: var(--skin-accent);
  color: var(--skin-bg);
  border-radius: var(--skin-radius-xl);
  padding: 8px 12px;
  font-size: 13px;
  line-height: 1.5;
  word-break: break-word;
}
.chi-msg--assistant {
  align-self: flex-start;
}
.chi-msg--assistant .chi-msg-text {
  color: var(--skin-ink);
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}
.chi-msg--loading {
  flex-direction: row;
  align-items: center;
  gap: 4px;
  padding: 6px 0;
}
@keyframes chiDotPulse {
  0%, 100% { opacity: 0.2; }
  50% { opacity: 1; }
}
.chi-dot-pulse {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--skin-ink-soft);
  display: inline-block;
  animation: chiDotPulse 1.2s ease-in-out infinite;
}
.chi-dot-pulse--2 { animation-delay: 0.2s; }
.chi-dot-pulse--3 { animation-delay: 0.4s; }
.chi-input-bar {
  position: sticky;
  bottom: 0;
  border-top: 1px solid var(--skin-line);
  background: var(--skin-surface);
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}
.chi-mention-menu {
  position: absolute;
  bottom: 100%;
  left: 0;
  background: var(--skin-surface);
  border: 1px solid var(--skin-line);
  border-radius: var(--skin-radius-lg);
  padding: 4px;
  z-index: 10;
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.chi-mention-item {
  background: none;
  border: 1px solid var(--skin-line);
  border-radius: var(--skin-radius);
  color: var(--skin-ink);
  font-size: 12px;
  padding: 4px 10px;
  cursor: pointer;
  display: flex;
  gap: 4px;
  align-items: center;
  font-family: inherit;
}
.chi-mention-item:hover { background: var(--skin-surface2); }
.chi-textarea {
  width: 100%;
  background: var(--skin-bg);
  border: 1px solid var(--skin-line);
  border-radius: var(--skin-radius);
  color: var(--skin-ink);
  font-family: inherit;
  font-size: 13px;
  padding: 8px 10px;
  resize: none;
  outline: none;
  line-height: 1.5;
  box-sizing: border-box;
}
.chi-textarea:focus { border-color: var(--skin-accent); }
.chi-textarea:disabled { opacity: 0.5; }
.chi-input-actions {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
  align-items: center;
}
.chi-action-btn {
  background: none;
  border: 1px solid var(--skin-line);
  border-radius: var(--skin-radius);
  color: var(--skin-ink-soft);
  font-size: 16px;
  width: 32px;
  height: 32px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}
.chi-action-btn--disabled { opacity: 0.4; cursor: not-allowed; }
.chi-send-btn {
  background: var(--skin-accent);
  color: var(--skin-bg);
  border: none;
  border-radius: var(--skin-radius);
  font-size: 16px;
  width: 32px;
  height: 32px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  font-weight: 700;
}
.chi-send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
`;

// ─── Component ────────────────────────────────────────────────────────────────

export function ChiCompanionPanel({
  tenantId,
  context,
  onContextChange,
  altitude = 1,
  onAltitudeChange,
  onCardAccept,
  onCardDismiss,
  className,
  style,
}: ChiCompanionPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mentionOpen, setMentionOpen] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setInput(val);
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = `${ta.scrollHeight}px`;
    if (val.endsWith('@')) {
      setMentionOpen(true);
    } else if (!val.includes('@')) {
      setMentionOpen(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  function insertMention(token: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const pos = ta.selectionStart ?? input.length;
    const before = input.slice(0, pos).replace(/@$/, '');
    const after = input.slice(pos);
    const newVal = `${before}@${token} ${after}`;
    setInput(newVal);
    setMentionOpen(false);
    setTimeout(() => {
      ta.focus();
      const newPos = before.length + token.length + 2;
      ta.setSelectionRange(newPos, newPos);
    }, 0);
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setIsLoading(true);

    try {
      const res = await answerWithContext(
        {
          message: text,
          objective_id: context?.objectiveId ?? '',
          project_id: context?.projectId ?? '',
          tenant_id: tenantId,
          altitude,
        },
        getSessionToken,
      );
      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: res.reply_markdown,
        cards: res.cards,
        cardStatuses: {},
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      const errMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: 'Something went wrong — please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  }

  const handleConfirm = async (msgId: string, card: AICard) => {
    if (!card.proposal) return;

    setMessages(prev => prev.map(m =>
      m.id !== msgId ? m : {
        ...m,
        cardStatuses: { ...m.cardStatuses, [card.id]: { status: 'pending' as const } },
      }
    ));

    // TODO: pass Supabase session JWT — wire via prop or context
    const result = await executeProposal(card.proposal, getSessionToken, '');

    setMessages(prev => prev.map(m =>
      m.id !== msgId ? m : {
        ...m,
        cardStatuses: {
          ...m.cardStatuses,
          [card.id]: result.ok
            ? { status: 'success' as const, message: result.committed_id }
            : { status: 'error' as const, message: result.error },
        },
      }
    ));

    onCardAccept?.(card, { ok: result.ok, error: result.error });
  };

  const handleDismiss = (msgId: string, card: AICard) => {
    setMessages(prev => prev.map(m =>
      m.id !== msgId ? m : {
        ...m,
        cardStatuses: {
          ...m.cardStatuses,
          [card.id]: { status: 'error' as const, message: 'dismissed' },
        },
      }
    ));
    onCardDismiss?.(card);
  };

  const handleAcceptAll = async (msgId: string, cards: AICard[]) => {
    for (const card of cards) {
      await handleConfirm(msgId, card);
    }
  };

  return (
    <div className={`chi-companion-panel${className ? ` ${className}` : ''}`} ref={wrapperRef} style={style}>
      <style>{PANEL_STYLES}</style>

      {/* Header */}
      <div className="chi-header">
        <span className="chi-title">Chi AI</span>
        <div className="chi-altitude-dots">
          <span
            className={altitude === 0 ? 'chi-dot chi-dot--active' : 'chi-dot'}
            onClick={() => onAltitudeChange?.(0)}
            title="Glide"
          />
          <div className="chi-avatar-dot" onClick={() => onAltitudeChange?.(1)} title="Cruise">
            ✈
          </div>
          <span
            className={altitude === 2 ? 'chi-dot chi-dot--active' : 'chi-dot'}
            onClick={() => onAltitudeChange?.(2)}
            title="Cockpit"
          />
        </div>
      </div>

      {/* Context breadcrumb */}
      <div className="chi-context-bar">
        <span className="chi-context-label">Collaborate on Content and Context:</span>
        <div className="chi-breadcrumb">
          <button
            className="chi-crumb"
            onClick={() => context?.projectId && onContextChange?.('project', context.projectId)}
          >
            {context?.projectLabel ?? 'Project'}
          </button>
          <span className="chi-crumb-sep">›</span>
          <button
            className="chi-crumb"
            onClick={() => context?.objectiveId && onContextChange?.('objective', context.objectiveId)}
          >
            {context?.objectiveLabel ?? 'Objective'}
          </button>
          <span className="chi-crumb-sep">›</span>
          <button
            className="chi-crumb"
            onClick={() => context?.taskId && onContextChange?.('task', context.taskId)}
          >
            {context?.taskLabel ?? 'Task/Note'}
          </button>
        </div>
      </div>

      {/* Chat area */}
      <div className="chi-chat" ref={chatRef}>
        {messages.length === 0 && (
          <p className="chi-greeting">
            Hi! I'm your Chi AI companion. What would you like to work on today?
          </p>
        )}
        {messages.map(msg => (
          <div
            key={msg.id}
            className={msg.role === 'user' ? 'chi-msg chi-msg--user' : 'chi-msg chi-msg--assistant'}
          >
            <span className="chi-msg-text">{msg.text}</span>
            {msg.cards && msg.cards.length > 0 && (
              <CompanionCardStack
                cards={msg.cards.map(c => ({ ...c, body: c.body ?? '' }))}
                proposalResults={msg.cardStatuses ?? {}}
                onConfirm={(cardId) => {
                  const card = msg.cards!.find(c => c.id === cardId);
                  if (card) void handleConfirm(msg.id, card);
                }}
                onDismiss={(cardId) => {
                  const card = msg.cards!.find(c => c.id === cardId);
                  if (card) handleDismiss(msg.id, card);
                }}
              />
            )}
            {msg.cards && msg.cards.length > 1 && (
              <button
                style={{ marginTop: 6, fontSize: 12, cursor: 'pointer', alignSelf: 'flex-end',
                  background: 'none', border: '1px solid var(--skin-line)', borderRadius: 'var(--skin-radius)',
                  color: 'var(--skin-ink-soft)', padding: '4px 10px', fontFamily: 'inherit' }}
                onClick={() => void handleAcceptAll(msg.id, msg.cards!)}
              >
                Accept all
              </button>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="chi-msg chi-msg--assistant chi-msg--loading">
            <span className="chi-dot-pulse" />
            <span className="chi-dot-pulse chi-dot-pulse--2" />
            <span className="chi-dot-pulse chi-dot-pulse--3" />
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="chi-input-bar">
        {mentionOpen && (
          <div className="chi-mention-menu">
            {MENTION_OPTIONS.map(opt => (
              <button
                key={opt.token}
                className="chi-mention-item"
                onClick={() => insertMention(opt.token)}
              >
                <span>{opt.icon}</span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        )}
        <textarea
          ref={textareaRef}
          className="chi-textarea"
          placeholder="Ask Chi AI…"
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={isLoading}
        />
        <div className="chi-input-actions">
          <button
            className="chi-action-btn"
            onClick={() => setMentionOpen(o => !o)}
            title="Add mention"
          >
            ＋
          </button>
          <button
            className="chi-action-btn chi-action-btn--disabled"
            title="Voice input (coming soon)"
            disabled
          >
            🎤
          </button>
          <button
            className="chi-send-btn"
            onClick={() => void handleSend()}
            disabled={isLoading || !input.trim()}
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}
