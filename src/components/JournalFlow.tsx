import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  ArrowLeft,
  Loader2,
  Sparkles,
  History as HistoryIcon,
  CheckCircle2,
  XCircle,
} from "lucide-react";

export type EntityType = 'objective' | 'task' | 'note' | 'resource';
import { useAuth } from "@/contexts/auth";
import { useActiveProject } from "@/contexts/active-project";
import { useIsMobile } from "@/hooks/use-mobile";
import { createNote } from "@/lib/xcamp-api";
import { supabase } from "@/lib/supabase";
import {
  analyse,
  answerWithContext,
  confirmSession,
  commitSession,
  listJournalSessions,
  getSessionProposals,
  placementLabel,
  type JournalTopic,
  type JournalProposal,
  type SessionStatus,
  type HistoricalProposal,
} from "@/lib/journal-api";
import { executeProposal } from "@xchange/client";
import type { AICard } from "@xchange/client";
import { EntityPanel } from "@/components/EntityPanel";

type Screen = "input" | "cards" | "editor" | "history";

function defaultTopicEntityType(topic: JournalTopic): EntityType {
  if (topic.organiser_proposals.some(p => p.proposal_type === 'new_objective')) return 'objective';
  switch (topic.suggested_note_type) {
    case 'task': return 'task';
    case 'resource': return 'resource';
    default: return 'note';
  }
}

function defaultCardEntityType(kind: string): EntityType {
  if (kind === 'task' || kind === 'action_item') return 'task';
  return 'note';
}

function resolveApprovalOverrides(
  entityType: EntityType,
  existingProposalType: string,
): { proposal_type?: string; note_type?: string } {
  switch (entityType) {
    case 'objective':
      return existingProposalType === 'new_objective' ? {} : { proposal_type: 'new_objective' };
    case 'task':
      return { proposal_type: 'add_note', note_type: 'task' };
    case 'resource':
      return { proposal_type: 'add_note', note_type: 'reference' };
    case 'note':
    default:
      if (existingProposalType === 'link_to_objective') return {};
      return { proposal_type: 'add_note', note_type: 'note' };
  }
}

export function buildContextCardProposal(
  card: AICard,
  entityType: EntityType,
): AICard['proposal'] | undefined {
  const original = card.proposal;
  if (!original) return undefined;
  const orig = original as unknown as { tool: string; payload?: Record<string, unknown> };
  const basePayload: Record<string, unknown> = orig.payload ?? {};
  const title = typeof basePayload.title === 'string' ? basePayload.title : card.title;
  switch (entityType) {
    case 'objective':
      return { tool: 'create_objective', payload: { title, project_id: basePayload.project_id } } as unknown as AICard['proposal'];
    case 'task':
      return { tool: 'create_task', payload: { ...basePayload, title } } as unknown as AICard['proposal'];
    case 'resource':
      return { tool: 'add_note', payload: { ...basePayload, title, note_type: 'reference' } } as unknown as AICard['proposal'];
    case 'note':
    default:
      return { tool: 'add_note', payload: { ...basePayload, title, note_type: 'note' } } as unknown as AICard['proposal'];
  }
}

export function EntityTypeSelector({ selected, onChange }: { selected: EntityType; onChange: (type: EntityType) => void }) {
  const types: { value: EntityType; label: string }[] = [
    { value: 'objective', label: 'Objective' },
    { value: 'task', label: 'Task' },
    { value: 'note', label: 'Note' },
    { value: 'resource', label: 'Resource' },
  ];
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {types.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          style={{
            fontSize: 12, fontWeight: 500,
            padding: '4px 12px', borderRadius: 999,
            border: selected === value ? '1px solid var(--skin-accent)' : '1px solid var(--skin-line)',
            background: selected === value ? 'color-mix(in srgb, var(--skin-accent) 12%, transparent)' : 'transparent',
            color: selected === value ? 'var(--skin-accent)' : 'var(--skin-ink-soft)',
            cursor: 'pointer',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function resolvedPlacement(p: JournalProposal): string {
  const project = p.payload.project_title;
  const objective = p.payload.objective_title || p.payload.title;
  if (project && objective) return `${project} > ${objective}`;
  if (project) return String(project);
  if (objective) return String(objective);
  return placementLabel(p);
}

function statusColors(status: SessionStatus): { bg: string; fg: string } {
  switch (status) {
    case "committed":
      return { bg: "color-mix(in srgb, var(--skin-accent) 18%, transparent)", fg: "var(--skin-accent)" };
    case "partial":
      return { bg: "color-mix(in srgb, #e0a23a 22%, transparent)", fg: "#b87814" };
    default:
      return { bg: "var(--skin-surface2)", fg: "var(--skin-ink-soft)" };
  }
}

interface PanelTarget {
  type: 'note' | 'task' | 'objective';
  id: string;
  objectiveId?: string;
  prefillText?: string;
  initialTitle?: string;
}

export function JournalFlow({
  draft = null,
}: {
  draft?: { text: string; key: number } | null;
}) {
  const { user, loading } = useAuth();
  const { activeProjectId } = useActiveProject();
  const isMobile = useIsMobile();

  const [screen, setScreen] = useState<Screen>("input");
  const [entryText, setEntryText] = useState("");
  const [analysing, setAnalysing] = useState(false);
  const [topics, setTopics] = useState<JournalTopic[]>([]);
  const [cards, setCards] = useState<AICard[]>([]);
  const [cardErrors, setCardErrors] = useState<Record<string, string>>({});
  const [accepting, setAccepting] = useState<string | null>(null);
  const [panelTarget, setPanelTarget] = useState<PanelTarget | null>(null);
  const [editingTopic, setEditingTopic] = useState<JournalTopic | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [openSession, setOpenSession] = useState<string | null>(null);
  const [appliedCards, setAppliedCards] = useState<Map<string, PanelTarget>>(new Map());
  const [savedTopicIds, setSavedTopicIds] = useState<Set<string>>(new Set());
  const [savedTopicTargets, setSavedTopicTargets] = useState<Map<string, PanelTarget>>(new Map());
  // suggestedCards: topic.id → cards spawned by that topic's objective commit.
  // Kept separate from context cards so rendering doesn't cross-reference two Maps.
  const [suggestedCards, setSuggestedCards] = useState<Map<string, AICard[]>>(new Map());
  // User-selected entity type per topic (overrides AI suggestion)
  const [topicTypes, setTopicTypes] = useState<Map<string, EntityType>>(new Map());
  // Entity type selected for the topic currently in the editor
  const [editingTopicType, setEditingTopicType] = useState<EntityType>('note');

  useEffect(() => {
    if (!draft) return;
    setEntryText(draft.text);
    setScreen("input");
    setEditingTopic(null);
  }, [draft]);

  const sessionsQuery = useQuery({
    queryKey: ["journal-sessions", user?.centralId],
    queryFn: () => listJournalSessions(user!.centralId),
    enabled: !!user,
  });

  const handleProcess = async () => {
    const text = entryText.trim();
    if (!text || !user) return;
    setAnalysing(true);
    try {
      const [analysisResult, contextResult] = await Promise.allSettled([
        analyse({ text, userId: user.centralId, tenantId: user.tenantId, projectId: activeProjectId ?? undefined }),
        answerWithContext({ question: text, tenantId: user.tenantId, projectId: activeProjectId ?? undefined }),
      ]);

      const newTopics = analysisResult.status === "fulfilled" ? analysisResult.value : [];
      const newCards = contextResult.status === "fulfilled" ? contextResult.value.cards : [];

      if (analysisResult.status === "rejected") {
        toast.error((analysisResult.reason as Error).message);
      }

      setTopics(newTopics);
      setCards(newCards);
      setCardErrors({});
      setAppliedCards(new Map());
      setSavedTopicIds(new Set());
      setSavedTopicTargets(new Map());
      setSuggestedCards(new Map());
      const initialTypes = new Map<string, EntityType>();
      for (const t of newTopics) initialTypes.set(t.id, defaultTopicEntityType(t));
      setTopicTypes(initialTypes);
      setScreen("cards");

      if (newTopics.length === 0 && newCards.length === 0) {
        toast("No topics found in this entry.");
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAnalysing(false);
    }
  };

  const handleDismissTopic = async (topic: JournalTopic) => {
    setTopics((prev) => prev.filter((t) => t.id !== topic.id));
    setSuggestedCards((prev) => { const next = new Map(prev); next.delete(topic.id); return next; });
    if (topic.organiser_proposals.length > 0 && topic.organiser_session_id) {
      try {
        await confirmSession(
          topic.organiser_session_id,
          topic.organiser_proposals
            .filter((p) => p.proposal_id)
            .map((p) => ({ proposal_id: p.proposal_id!, approved: false })),
        );
      } catch (e) {
        toast.error((e as Error).message);
      }
    }
  };

  const handleAcceptCard = async (card: AICard, selectedType: EntityType) => {
    setAccepting(card.id);

    if (selectedType === 'objective') {
      // Objective creation — existing proposal/execute path, untouched
      const modifiedProposal = buildContextCardProposal(card, selectedType);
      if (!modifiedProposal) { setAccepting(null); return; }
      const token = await supabase.auth.getSession().then(r => r.data.session?.access_token ?? '');
      const result = await executeProposal(
        modifiedProposal,
        () => Promise.resolve(token || null),
        (import.meta.env.VITE_BACKEND_URL as string) ?? '',
      );
      setAccepting(null);
      if (result.ok) {
        const rawPayload = (modifiedProposal as unknown as { payload: Record<string, unknown> }).payload;
        const payloadTitle = typeof rawPayload?.title === 'string' ? rawPayload.title : card.title;
        const objId = typeof rawPayload?.objective_id === 'string' ? rawPayload.objective_id : undefined;
        const target: PanelTarget = { type: 'objective', id: result.committed_id ?? objId ?? '', prefillText: card.body, initialTitle: payloadTitle };
        setAppliedCards((prev) => new Map(prev).set(card.id, target));
        setPanelTarget(target);
        toast.success('Applied');
      } else {
        setCardErrors((prev) => ({ ...prev, [card.id]: result.error ?? 'Unknown error' }));
      }
      return;
    }

    // Note, Task, Resource — createNote() directly; no objective required
    const noteType = selectedType === 'task' ? 'task' : selectedType === 'resource' ? 'reference' : 'note';
    const rawProposal = card.proposal as unknown as { payload?: Record<string, unknown> } | undefined;
    const basePayload = rawProposal?.payload ?? {};
    const title = typeof basePayload.title === 'string' ? basePayload.title : (card.title ?? 'Untitled');

    try {
      const note = await createNote(user!, {
        title,
        bodyHtml: '',
        noteType,
        projectId: null,
        objectiveIds: [],
        tags: [],
      });
      setAccepting(null);
      const panelType: PanelTarget['type'] = selectedType === 'task' ? 'task' : 'note';
      const target: PanelTarget = { type: panelType, id: note.id, prefillText: card.body, initialTitle: title };
      setAppliedCards((prev) => new Map(prev).set(card.id, target));
      setPanelTarget(target);
      toast.success('Applied');
    } catch (err) {
      setAccepting(null);
      setCardErrors((prev) => ({ ...prev, [card.id]: (err as Error).message ?? 'Unknown error' }));
    }
  };

  const handleDismissCard = (card: AICard) => {
    setCards((prev) => prev.filter((c) => c.id !== card.id));
    setSuggestedCards((prev) => {
      const next = new Map(prev);
      for (const [k, v] of next) next.set(k, v.filter((c) => c.id !== card.id));
      return next;
    });
  };

  const startNew = () => {
    setEntryText("");
    setTopics([]);
    setCards([]);
    setCardErrors({});
    setEditingTopic(null);
    setOpenSession(null);
    setAppliedCards(new Map());
    setSavedTopicIds(new Set());
    setSavedTopicTargets(new Map());
    setSuggestedCards(new Map());
    setTopicTypes(new Map());
    setScreen("input");
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center py-16" style={{ color: "var(--skin-ink-soft)" }}>
        <Loader2 className="animate-spin" size={20} />
      </div>
    );
  }

  const effCollapsed = isMobile ? false : collapsed;
  const sidebarWidth = effCollapsed ? 56 : 300;
  const sessions = sessionsQuery.data ?? [];

  return (
    <>
      <div
        style={{
          display: isMobile ? "flex" : "grid",
          flexDirection: isMobile ? "column" : undefined,
          gridTemplateColumns: isMobile ? undefined : `${sidebarWidth}px 1fr`,
          minHeight: isMobile ? "auto" : "70vh",
        }}
      >
        {/* Sidebar */}
        <aside
          style={{
            background: "var(--skin-surface)",
            borderRight: isMobile ? "none" : "1px solid var(--skin-line)",
            borderBottom: isMobile ? "1px solid var(--skin-line)" : "none",
            padding: effCollapsed ? "16px 8px" : "18px 14px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {effCollapsed ? (
            <div className="flex flex-col items-center gap-3">
              <button
                className="x-btn-secondary"
                aria-label="Expand sidebar"
                title="Expand sidebar"
                style={{ height: 36, width: 36, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
                onClick={() => setCollapsed(false)}
              >
                <PanelLeftOpen size={16} />
              </button>
              <button
                className="x-btn-primary"
                aria-label="New entry"
                title="New entry"
                style={{ height: 36, width: 36, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
                onClick={() => { startNew(); setCollapsed(false); }}
              >
                <Plus size={16} />
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold" style={{ color: "var(--skin-ink)", fontSize: 15 }}>
                  Journal
                </div>
                {!isMobile && (
                  <button
                    className="x-btn-secondary"
                    aria-label="Collapse sidebar"
                    title="Collapse sidebar"
                    style={{ height: 30, width: 30, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
                    onClick={() => setCollapsed(true)}
                  >
                    <PanelLeftClose size={15} />
                  </button>
                )}
              </div>

              <button className="x-btn-primary" onClick={startNew}>
                + New entry
              </button>

              <div
                className="flex items-center gap-1.5 mt-1"
                style={{ color: "var(--skin-ink-faint)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}
              >
                <HistoryIcon size={13} /> History
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6, overflowY: "auto" }}>
                {sessionsQuery.isLoading && (
                  <div style={{ fontSize: 12, color: "var(--skin-ink-faint)", padding: "4px 2px" }}>Loading…</div>
                )}
                {!sessionsQuery.isLoading && sessions.length === 0 && (
                  <div style={{ fontSize: 12, color: "var(--skin-ink-faint)", padding: "4px 2px" }}>
                    No journal sessions yet.
                  </div>
                )}
                {sessions.map((s) => {
                  const c = statusColors(s.status);
                  const isSelected = openSession === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => { setOpenSession(s.id); setScreen("history"); }}
                      style={{
                        width: "100%", textAlign: "left", border: "1px solid var(--skin-line)",
                        background: isSelected ? "var(--skin-surface2)" : "transparent",
                        borderRadius: 8, padding: "8px 10px", cursor: "pointer",
                        outline: isSelected ? "2px solid var(--skin-accent)" : "none",
                        outlineOffset: -1,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                        <span style={{ fontSize: 12, color: "var(--skin-ink)" }}>
                          {new Date(s.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 999, background: c.bg, color: c.fg }}>
                          {s.status}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--skin-ink-faint)", marginTop: 2 }}>
                        {s.proposalCount} {s.proposalCount === 1 ? "proposal" : "proposals"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </aside>

        {/* Main pane */}
        <div style={{ padding: isMobile ? "16px" : "22px 26px", minWidth: 0 }}>
          {screen === "input" && (
            <div className="max-w-2xl">
              <h2 className="text-lg font-semibold mb-1" style={{ color: "var(--skin-ink)" }}>
                New journal entry
              </h2>
              <p className="mb-3" style={{ color: "var(--skin-ink-soft)", fontSize: 14 }}>
                Write freely. We'll analyse it and suggest notes linked to your projects.
              </p>
              <textarea
                className="x-input"
                style={{ width: "100%", minHeight: 200, padding: 14, fontSize: 15, lineHeight: 1.6, resize: "vertical" }}
                placeholder="What's on your mind today?"
                value={entryText}
                onChange={(e) => setEntryText(e.target.value)}
                disabled={analysing}
              />
              <div className="mt-3 flex items-center gap-3">
                <button
                  className="x-btn-primary"
                  style={{ width: "auto", paddingInline: 22 }}
                  onClick={handleProcess}
                  disabled={analysing || !entryText.trim()}
                >
                  {analysing ? (
                    <><Loader2 size={15} className="animate-spin" style={{ display: "inline", marginRight: 6 }} /> Analysing your entry…</>
                  ) : (
                    "Process"
                  )}
                </button>
              </div>
            </div>
          )}

          {screen === "cards" && (
            <div className="max-w-2xl">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold" style={{ color: "var(--skin-ink)" }}>
                  Suggested topics
                </h2>
                <button className="x-btn-secondary" style={{ width: "auto", paddingInline: 14 }} onClick={startNew}>
                  <ArrowLeft size={14} style={{ display: "inline", marginRight: 6 }} /> New entry
                </button>
              </div>

              {topics.length === 0 && cards.length === 0 ? (
                <div style={{ padding: "32px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                  <CheckCircle2 size={36} style={{ color: "var(--skin-accent)", opacity: 0.7 }} />
                  <p style={{ color: "var(--skin-ink-faint)", fontSize: 14, textAlign: "center", margin: 0 }}>
                    No suggestions remaining.
                  </p>
                  <button className="x-btn-primary" style={{ width: "auto", paddingInline: 20 }} onClick={startNew}>
                    New entry
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {topics.map((topic) => {
                    const topicSuggested = suggestedCards.get(topic.id) ?? [];
                    return (
                      <div key={topic.id} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <TopicCard
                          topic={topic}
                          saved={savedTopicIds.has(topic.id)}
                          target={savedTopicTargets.get(topic.id)}
                          selectedType={topicTypes.get(topic.id) ?? defaultTopicEntityType(topic)}
                          onTypeChange={(type) => setTopicTypes(prev => new Map(prev).set(topic.id, type))}
                          onAccept={() => {
                            setEditingTopic(topic);
                            setEditingTopicType(topicTypes.get(topic.id) ?? defaultTopicEntityType(topic));
                            setScreen("editor");
                          }}
                          onDismiss={() => handleDismissTopic(topic)}
                          onGoTo={(t) => setPanelTarget(t)}
                        />
                        {topicSuggested.map((card) => (
                          <div
                            key={card.id}
                            style={{
                              borderLeft: "3px solid var(--skin-accent)",
                              paddingLeft: 12,
                              marginLeft: 8,
                            }}
                          >
                            <AICardView
                              card={card}
                              accepting={accepting === card.id}
                              error={cardErrors[card.id]}
                              applied={appliedCards.has(card.id)}
                              onGoTo={appliedCards.has(card.id) ? () => setPanelTarget(appliedCards.get(card.id)!) : undefined}
                              onAccept={(type) => handleAcceptCard(card, type)}
                              onDismiss={() => handleDismissCard(card)}
                            />
                          </div>
                        ))}
                      </div>
                    );
                  })}
                  {cards.map((card) => (
                    <AICardView
                      key={card.id}
                      card={card}
                      accepting={accepting === card.id}
                      error={cardErrors[card.id]}
                      applied={appliedCards.has(card.id)}
                      onGoTo={appliedCards.has(card.id) ? () => setPanelTarget(appliedCards.get(card.id)!) : undefined}
                      onAccept={(type) => handleAcceptCard(card, type)}
                      onDismiss={() => handleDismissCard(card)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {screen === "editor" && editingTopic && (
            <NoteEditorPane
              topic={editingTopic}
              selectedType={editingTopicType}
              projectId={activeProjectId ?? undefined}
              onBack={() => { setScreen("cards"); setEditingTopic(null); }}
              onSaved={(newSuggestedCards, newTarget) => {
                const topicId = editingTopic!.id;
                setSavedTopicIds((prev) => new Set([...prev, topicId]));
                if (newTarget) {
                  setSavedTopicTargets((prev) => new Map(prev).set(topicId, newTarget));
                }
                if (newSuggestedCards && newSuggestedCards.length > 0) {
                  setSuggestedCards((prev) => {
                    const next = new Map(prev);
                    const existing = next.get(topicId) ?? [];
                    next.set(topicId, [...existing, ...newSuggestedCards]);
                    return next;
                  });
                }
                setEditingTopic(null);
                setScreen("cards");
                sessionsQuery.refetch();
              }}
            />
          )}

          {screen === "history" && openSession && (
            <SessionHistoryView
              sessionId={openSession}
              onBack={() => { setOpenSession(null); setScreen("input"); }}
            />
          )}
        </div>
      </div>

      {panelTarget && (
        <EntityPanel
          open={panelTarget !== null}
          onClose={() => setPanelTarget(null)}
          type={panelTarget.type}
          id={panelTarget.id}
          objectiveId={panelTarget.objectiveId}
          prefillText={panelTarget.prefillText}
          initialTitle={panelTarget.initialTitle}
          user={user ?? undefined}
        />
      )}
    </>
  );
}

function PlacementPills({ proposals, resolve = false }: { proposals: JournalProposal[]; resolve?: boolean }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {proposals.map((p, i) => (
        <span
          key={p.proposal_id ?? i}
          style={{
            fontSize: 11, padding: "3px 9px", borderRadius: 999,
            background: "var(--skin-surface2)", color: "var(--skin-ink-soft)",
            border: "1px solid var(--skin-line)",
          }}
        >
          {resolve ? `→ ${resolvedPlacement(p)}` : placementLabel(p)}
        </span>
      ))}
    </div>
  );
}

function TopicCard({
  topic,
  onAccept,
  onDismiss,
  saved = false,
  target,
  onGoTo,
  selectedType,
  onTypeChange,
}: {
  topic: JournalTopic;
  onAccept: () => void;
  onDismiss: () => void;
  saved?: boolean;
  target?: PanelTarget;
  onGoTo?: (target: PanelTarget) => void;
  selectedType: EntityType;
  onTypeChange: (type: EntityType) => void;
}) {
  return (
    <div
      style={{
        border: "1px solid var(--skin-line)", borderRadius: 14, padding: 16,
        background: "var(--skin-surface)", display: "flex", flexDirection: "column", gap: 10,
        opacity: saved ? 0.75 : 1,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold" style={{ color: "var(--skin-ink)", fontSize: 16 }}>
          {topic.title}
        </h3>
      </div>
      {topic.summary && (
        <p style={{ color: "var(--skin-ink-soft)", fontSize: 14, lineHeight: 1.55 }}>{topic.summary}</p>
      )}
      {topic.organiser_proposals.length > 0 && <PlacementPills proposals={topic.organiser_proposals} />}
      {!saved && <EntityTypeSelector selected={selectedType} onChange={onTypeChange} />}
      <div className="flex items-center gap-2 mt-1">
        {saved ? (
          <>
            <CheckCircle2 size={15} style={{ color: "var(--skin-accent)" }} />
            <span style={{ fontSize: 13, color: "var(--skin-accent)", fontWeight: 500 }}>Saved</span>
            {target && onGoTo && (
              <button
                onClick={() => onGoTo(target)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontSize: 13, color: "var(--skin-ink-soft)", padding: "0 4px",
                  textDecoration: "underline",
                }}
              >
                Go to →
              </button>
            )}
          </>
        ) : (
          <>
            <button className="x-btn-primary" style={{ width: "auto", paddingInline: 20 }} onClick={onAccept}>
              Accept
            </button>
            <button
              onClick={onDismiss}
              style={{
                background: "none", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600,
                color: "var(--skin-danger, #d4524e)", padding: "8px 12px",
              }}
            >
              Dismiss
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function AICardView({
  card,
  accepting,
  error,
  onAccept,
  onDismiss,
  applied = false,
  onGoTo,
}: {
  card: AICard;
  accepting: boolean;
  error?: string;
  onAccept: (selectedType: EntityType) => void;
  onDismiss: () => void;
  applied?: boolean;
  onGoTo?: () => void;
}) {
  const [selectedType, setSelectedType] = useState<EntityType>(() => defaultCardEntityType(card.kind));

  const kindLabel: Record<string, string> = {
    task: "Task",
    action_item: "Action",
    update: "Update",
    opportunity: "Opportunity",
    content: "Content",
    urgency: "Urgent",
    celebration: "Win",
    metric: "Metric",
    web_result: "Reference",
  };

  return (
    <div
      style={{
        border: "1px solid var(--skin-line)", borderRadius: 14, padding: 16,
        background: "var(--skin-surface)", display: "flex", flexDirection: "column", gap: 10,
        opacity: accepting ? 0.7 : applied ? 0.75 : 1,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <Sparkles size={14} style={{ color: "var(--skin-accent)", flexShrink: 0 }} />
          <h3 className="font-semibold" style={{ color: "var(--skin-ink)", fontSize: 16 }}>
            {card.title}
          </h3>
        </div>
        <span
          style={{
            fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 999, whiteSpace: "nowrap",
            background: "color-mix(in srgb, var(--skin-accent) 10%, transparent)", color: "var(--skin-accent)",
          }}
        >
          {kindLabel[card.kind] ?? card.kind}
        </span>
      </div>

      {card.body && (
        <p style={{ color: "var(--skin-ink-soft)", fontSize: 14, lineHeight: 1.55 }}>{card.body}</p>
      )}

      {(card.proposal as unknown as { rationale?: string })?.rationale && (
        <p style={{ color: "var(--skin-ink-faint)", fontSize: 12, fontStyle: "italic", margin: 0 }}>
          {(card.proposal as unknown as { rationale?: string }).rationale}
        </p>
      )}

      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--skin-danger, #d4524e)", fontSize: 13 }}>
          <XCircle size={14} />
          {error}
        </div>
      )}

      {applied ? (
        <div className="flex items-center gap-2 mt-1">
          <CheckCircle2 size={14} style={{ color: "var(--skin-accent)" }} />
          <span style={{ fontSize: 13, color: "var(--skin-accent)", fontWeight: 500 }}>Applied</span>
          {onGoTo && (
            <button
              onClick={onGoTo}
              style={{
                background: "none", border: "none", cursor: "pointer",
                fontSize: 13, color: "var(--skin-ink-soft)", padding: "0 4px",
                textDecoration: "underline",
              }}
            >
              Go to →
            </button>
          )}
        </div>
      ) : (
        (card.confirmable || card.dismissible) && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {card.confirmable && card.proposal && (
              <EntityTypeSelector selected={selectedType} onChange={setSelectedType} />
            )}
            <div className="flex items-center gap-2">
              {card.confirmable && (
                <button
                  className="x-btn-primary"
                  style={{ width: "auto", paddingInline: 20 }}
                  onClick={() => onAccept(selectedType)}
                  disabled={accepting || !card.proposal}
                >
                  {accepting ? (
                    <><Loader2 size={14} className="animate-spin" style={{ display: "inline", marginRight: 6 }} />Accepting…</>
                  ) : "Create"}
                </button>
              )}
              {card.dismissible && (
                <button
                  onClick={onDismiss}
                  disabled={accepting}
                  style={{
                    background: "none", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600,
                    color: "var(--skin-danger, #d4524e)", padding: "8px 12px",
                  }}
                >
                  Dismiss
                </button>
              )}
            </div>
          </div>
        )
      )}
    </div>
  );
}

function NoteEditorPane({
  topic,
  selectedType,
  projectId,
  onBack,
  onSaved,
}: {
  topic: JournalTopic;
  selectedType: EntityType;
  projectId?: string;
  onBack: () => void;
  onSaved: (suggestedCards?: AICard[], panelTarget?: PanelTarget) => void;
}) {
  const { user } = useAuth();
  const [title, setTitle] = useState(topic.title);
  const [body, setBody] = useState(topic.summary);
  const [enriching, setEnriching] = useState(true);
  const [saving, setSaving] = useState(false);
  const hasProposals = topic.organiser_proposals.length > 0;

  useEffect(() => {
    let active = true;
    setEnriching(true);
    answerWithContext({
      question: `${topic.title}: ${topic.summary}`,
      tenantId: user!.tenantId,
      projectId,
    })
      .then((res) => {
        if (!active) return;
        if (res.answer.trim()) {
          setBody((prev) => `${prev}\n\n— From your projects —\n${res.answer.trim()}`);
        }
      })
      .catch((e) => toast.error((e as Error).message))
      .finally(() => active && setEnriching(false));
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const bodyHtml = `<p>${body.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br/>")}</p>`;
      let suggestedCards: AICard[] | undefined;
      let panelTarget: PanelTarget | undefined;
      if (hasProposals && topic.organiser_session_id) {
        await confirmSession(
          topic.organiser_session_id,
          topic.organiser_proposals
            .filter((p) => p.proposal_id)
            .map((p) => ({
              proposal_id: p.proposal_id!,
              approved: true,
              ...resolveApprovalOverrides(selectedType, p.proposal_type),
            })),
        );
        const commitResult = await commitSession(topic.organiser_session_id);
        suggestedCards = commitResult.suggested_task_cards;
        if (commitResult.failures && commitResult.failures.length > 0 && (!commitResult.results || commitResult.results.length === 0)) {
          const firstError = commitResult.failures[0].error ?? 'Commit failed';
          throw new Error(firstError);
        }
        if (commitResult.results && commitResult.results.length > 0) {
          const first = commitResult.results[0];
          if (selectedType === 'objective' || first.proposal_type === 'new_objective') {
            panelTarget = { type: 'objective', id: first.id };
          } else if (selectedType === 'task') {
            panelTarget = { type: 'task', id: first.id, objectiveId: first.objective_id };
          } else if (first.proposal_type === 'link_to_objective') {
            panelTarget = { type: 'note', id: first.id, objectiveId: first.objective_id };
          } else {
            panelTarget = { type: 'note', id: first.id };
          }
        }
        toast.success("Note saved and linked");
      } else {
        const noteTypeMap: Record<EntityType, string> = {
          objective: 'note',
          task: 'task',
          note: 'note',
          resource: 'reference',
        };
        await createNote(user, { title, bodyHtml, noteType: noteTypeMap[selectedType] ?? 'note' });
        toast.success("Note saved");
      }
      onSaved(suggestedCards, panelTarget);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <button className="x-btn-secondary mb-3" style={{ width: "auto", paddingInline: 14 }} onClick={onBack}>
        <ArrowLeft size={14} style={{ display: "inline", marginRight: 6 }} /> Back
      </button>

      <div className="mb-3">
        {hasProposals ? (
          <PlacementPills proposals={topic.organiser_proposals} resolve />
        ) : (
          <span style={{ fontSize: 12, color: "var(--skin-ink-faint)", fontStyle: "italic" }}>
            No project context found
          </span>
        )}
      </div>

      <input
        className="x-input"
        style={{ width: "100%", fontSize: 18, fontWeight: 600, padding: "10px 12px", marginBottom: 10 }}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
      />

      <textarea
        className="x-input"
        style={{ width: "100%", minHeight: 240, padding: 14, fontSize: 15, lineHeight: 1.6, resize: "vertical" }}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Note body"
      />

      {enriching && (
        <div className="flex items-center gap-2 mt-2" style={{ color: "var(--skin-ink-soft)", fontSize: 13 }}>
          <Sparkles size={14} className="animate-pulse" /> Enriching with project context…
        </div>
      )}

      <div className="mt-4">
        <button
          className="x-btn-primary w-full sm:w-auto"
          style={{ paddingInline: 24 }}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <><Loader2 size={15} className="animate-spin" style={{ display: "inline", marginRight: 6 }} /> Saving…</>
          ) : (
            "Save"
          )}
        </button>
      </div>
    </div>
  );
}


interface HistoryPanelTarget {
  type: 'note' | 'task' | 'objective';
  id: string;
  objectiveId?: string;
}

function SessionHistoryView({ sessionId, onBack }: { sessionId: string; onBack: () => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["session-proposals", sessionId],
    queryFn: () => getSessionProposals(sessionId),
  });
  const [panelTarget, setPanelTarget] = useState<HistoryPanelTarget | null>(null);
  const proposals = data ?? [];

  const handleAccept = async (proposalId: string) => {
    try {
      await confirmSession(sessionId, [{ proposal_id: proposalId, approved: true }]);
      await commitSession(sessionId);
      await queryClient.invalidateQueries({ queryKey: ["session-proposals", sessionId] });
      toast.success('Card applied.');
    } catch {
      toast.error('Could not apply card.');
    }
  };

  const handleDismiss = async (proposalId: string) => {
    try {
      await confirmSession(sessionId, [{ proposal_id: proposalId, approved: false }]);
      await queryClient.invalidateQueries({ queryKey: ["session-proposals", sessionId] });
      toast.success('Card dismissed.');
    } catch {
      toast.error('Could not dismiss card.');
    }
  };

  const handleGoTo = (proposal: typeof proposals[number]) => {
    const committedId = proposal.payload.committed_entity_id as string | undefined;
    const committedType = proposal.payload.committed_entity_type as string | undefined;
    if (!committedId) return;
    const type: HistoryPanelTarget['type'] =
      committedType === 'objective' ? 'objective'
      : committedType === 'task' ? 'task'
      : 'note';
    const objectiveId = proposal.payload.objective_id as string | undefined;
    setPanelTarget({ type, id: committedId, objectiveId });
  };

  return (
    <>
      <div className="max-w-2xl">
        <div className="flex items-center gap-3 mb-4">
          <button
            className="x-btn-secondary"
            style={{ width: "auto", paddingInline: 14 }}
            onClick={onBack}
          >
            <ArrowLeft size={14} style={{ display: "inline", marginRight: 6 }} /> Back
          </button>
          <h2 className="text-lg font-semibold" style={{ color: "var(--skin-ink)" }}>
            Session cards
          </h2>
        </div>
        {isLoading && (
          <div style={{ color: "var(--skin-ink-faint)", fontSize: 14 }}>Loading…</div>
        )}
        {!isLoading && proposals.length === 0 && (
          <div style={{ color: "var(--skin-ink-faint)", fontSize: 14 }}>No proposals in this session.</div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {proposals.map((p) => (
            <HistoricalProposalCard
              key={p.id}
              proposal={p}
              onAccept={handleAccept}
              onDismiss={handleDismiss}
              onGoTo={handleGoTo}
            />
          ))}
        </div>
      </div>
      {panelTarget && (
        <EntityPanel
          open
          onClose={() => setPanelTarget(null)}
          type={panelTarget.type}
          id={panelTarget.id}
          objectiveId={panelTarget.objectiveId}
          user={user ?? undefined}
        />
      )}
    </>
  );
}

function HistoricalProposalCard({
  proposal,
  onAccept,
  onDismiss,
  onGoTo,
}: {
  proposal: HistoricalProposal;
  onAccept: (id: string) => Promise<void>;
  onDismiss: (id: string) => Promise<void>;
  onGoTo: (proposal: HistoricalProposal) => void;
}) {
  const [busy, setBusy] = useState(false);
  const statusConfig = {
    committed: { label: "Applied ✓", bg: "color-mix(in srgb, var(--skin-accent) 12%, transparent)", fg: "var(--skin-accent)" },
    approved:  { label: "Approved",  bg: "color-mix(in srgb, #22c55e 12%, transparent)",             fg: "#22c55e" },
    pending:   { label: "Pending",   bg: "color-mix(in srgb, var(--skin-ink-faint) 12%, transparent)", fg: "var(--skin-ink-faint)" },
    rejected:  { label: "Dismissed", bg: "color-mix(in srgb, var(--skin-danger, #d4524e) 10%, transparent)", fg: "var(--skin-danger, #d4524e)" },
  } as const;
  const cfg = statusConfig[proposal.status as keyof typeof statusConfig] ?? statusConfig.pending;
  const title = proposal.title ?? (proposal.payload.title as string | undefined) ?? "Untitled";
  const body = (proposal.payload.body_markdown as string | undefined) ?? (proposal.payload.description as string | undefined);
  const objectiveTitle = proposal.payload.objective_title as string | undefined;
  const typeLabel = proposal.proposal_type.replace(/_/g, " ");
  const hasGoTo = proposal.status === "committed" && !!proposal.payload.committed_entity_id;
  const showActions = proposal.status === "pending" || proposal.status === "approved" || hasGoTo;

  const btnBase: React.CSSProperties = {
    border: "1px solid var(--skin-line)", borderRadius: 8, padding: "4px 12px",
    cursor: busy ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 500,
    opacity: busy ? 0.5 : 1,
  };

  return (
    <div
      style={{
        border: "1px solid var(--skin-line)", borderRadius: 14, padding: 16,
        background: "var(--skin-surface)", display: "flex", flexDirection: "column", gap: 8,
        opacity: proposal.status === "rejected" ? 0.6 : 1,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          {proposal.status === "committed" && (
            <CheckCircle2 size={14} style={{ color: "var(--skin-accent)", flexShrink: 0 }} />
          )}
          {proposal.status === "rejected" && (
            <XCircle size={14} style={{ color: "var(--skin-danger, #d4524e)", flexShrink: 0 }} />
          )}
          <h3 className="font-semibold" style={{ color: "var(--skin-ink)", fontSize: 15 }}>{title}</h3>
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <span style={{
            fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 999,
            background: "color-mix(in srgb, var(--skin-ink-faint) 10%, transparent)",
            color: "var(--skin-ink-faint)", textTransform: "capitalize",
          }}>
            {typeLabel}
          </span>
          <span style={{
            fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 999,
            background: cfg.bg, color: cfg.fg,
          }}>
            {cfg.label}
          </span>
        </div>
      </div>
      {body && (
        <p style={{ color: "var(--skin-ink-soft)", fontSize: 13, lineHeight: 1.5, margin: 0 }}>{body}</p>
      )}
      {objectiveTitle && (
        <p style={{ fontSize: 12, color: "var(--skin-ink-faint)", margin: 0 }}>→ {objectiveTitle}</p>
      )}
      {showActions && (
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
          {proposal.status === "pending" && (
            <button
              disabled={busy}
              onClick={async () => { setBusy(true); await onDismiss(proposal.id); setBusy(false); }}
              style={{ ...btnBase, background: "transparent", color: "var(--skin-ink-soft)" }}
            >
              Dismiss
            </button>
          )}
          {(proposal.status === "pending" || proposal.status === "approved") && (
            <button
              disabled={busy}
              onClick={async () => { setBusy(true); await onAccept(proposal.id); setBusy(false); }}
              style={{ ...btnBase, background: "var(--skin-accent, #4de0c1)", color: "var(--skin-bg, #fff)", border: "none" }}
            >
              {busy ? "Applying…" : proposal.status === "approved" ? "Apply" : "Accept"}
            </button>
          )}
          {hasGoTo && (
            <button
              onClick={() => onGoTo(proposal)}
              style={{ ...btnBase, background: "transparent", color: "var(--skin-accent)" }}
            >
              Go to →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
