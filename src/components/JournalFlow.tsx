import React, { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Loader2,
  Sparkles,
  CheckCircle2,
  XCircle,
  ChevronDown,
} from "lucide-react";

export type EntityType = 'objective' | 'task' | 'note' | 'resource';
import { useAuth } from "@/contexts/auth";
import { useActiveProject } from "@/contexts/active-project";
import { useIsMobile } from "@/hooks/use-mobile";
import { useVoiceTranscription } from "@/hooks/useVoiceTranscription";
import { createNote } from "@/lib/xcamp-api";
import {
  analyse,
  confirmSession,
  commitSession,
  listJournalSessions,
  getSessionProposals,
  getJournalSession,
  placementLabel,
  type JournalTopic,
  type JournalProposal,
  type SessionStatus,
  type HistoricalProposal,
} from "@/lib/journal-api";
import { useRightPanel, type EntityPanelTarget } from "@/contexts/right-panel";
import type { AICard } from "@xchange/client";

type Screen = "input" | "history";

function defaultTopicEntityType(topic: JournalTopic): EntityType {
  if (topic.organiser_proposals.some(p => p.proposal_type === 'new_objective')) return 'objective';
  switch (topic.suggested_note_type) {
    case 'task': return 'task';
    case 'resource': return 'resource';
    default: return 'note';
  }
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

// Large branded record orb — brand X-mark SVG on teal radial gradient
function RecordOrb({ isListening, onClick, supported }: {
  isListening: boolean;
  onClick: () => void;
  supported: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!supported}
      title={isListening ? "Stop recording" : "Tap to record"}
      style={{
        width: 120,
        height: 120,
        borderRadius: "50%",
        border: "none",
        cursor: supported ? "pointer" : "not-allowed",
        background: "radial-gradient(circle at 35% 30%, #7be7d8, #2fb7c2 65%, #1f8f9a)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        animation: isListening ? "jrnPulse 1.5s ease-in-out infinite" : "none",
        transition: "opacity 150ms",
      }}
    >
      <svg width="42" height="42" viewBox="0 0 24 24" fill="none">
        <path d="M4 4l16 16M20 4L4 20" stroke="#fff" strokeWidth="3.6" strokeLinecap="round" />
      </svg>
    </button>
  );
}

// Root-level pending/created item card
function JournalItemCard({
  topic,
  isSaved,
  savedType,
  accepting,
  onDismiss,
  onCreateObjectiveAndTasks,
  onCreateNoteOrTask,
  onOpen,
}: {
  topic: JournalTopic;
  isSaved: boolean;
  savedType?: EntityType;
  accepting: boolean;
  onDismiss: () => void;
  onCreateObjectiveAndTasks: () => void;
  onCreateNoteOrTask: () => void;
  onOpen: () => void;
}) {
  const badgeLabel = isSaved
    ? (savedType === 'objective' ? 'Objective' : savedType === 'task' ? 'Task' : savedType === 'resource' ? 'Resource' : 'Note')
    : 'pending';

  return (
    <div style={{
      border: "1px solid var(--skin-line)",
      borderRadius: 12,
      padding: "16px 18px",
      background: "var(--skin-surface)",
      boxShadow: "var(--shadow-card, none)",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: "var(--skin-ink)" }}>{topic.title}</span>
        <span style={{
          flexShrink: 0,
          padding: "3px 11px",
          borderRadius: 999,
          fontSize: 11,
          fontWeight: 600,
          background: "var(--skin-surface2)",
          color: isSaved ? "var(--skin-ink)" : "var(--skin-ink-soft)",
        }}>
          {badgeLabel}
        </span>
      </div>
      {topic.summary && (
        <p style={{ margin: "0 0 14px", fontSize: 13, lineHeight: 1.55, color: "var(--skin-ink-soft)" }}>
          {topic.summary}
        </p>
      )}
      {isSaved ? (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onOpen}
            style={{
              padding: "8px 20px", border: "none", borderRadius: 999,
              background: "var(--skin-accent)", color: "#fff",
              fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}
          >
            Open
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={onDismiss}
            disabled={accepting}
            style={{
              padding: "8px 16px", border: "1px solid var(--skin-line)", borderRadius: 999,
              background: "var(--skin-surface)", color: "var(--skin-ink)",
              fontSize: 12, fontWeight: 600,
              cursor: accepting ? "not-allowed" : "pointer",
              opacity: accepting ? 0.5 : 1,
            }}
          >
            Dismiss
          </button>
          <button
            type="button"
            onClick={onCreateObjectiveAndTasks}
            disabled={accepting}
            style={{
              padding: "8px 16px", border: "none", borderRadius: 999,
              background: "var(--skin-accent)", color: "#fff",
              fontSize: 12, fontWeight: 700,
              cursor: accepting ? "not-allowed" : "pointer",
              opacity: accepting ? 0.7 : 1,
              display: "flex", alignItems: "center", gap: 4,
            }}
          >
            {accepting
              ? <><Loader2 size={12} className="animate-spin" style={{ display: "inline" }} /> Creating…</>
              : "Create Objective and Tasks"}
          </button>
          <button
            type="button"
            onClick={onCreateNoteOrTask}
            disabled={accepting}
            style={{
              padding: "8px 16px", border: "none", borderRadius: 999,
              background: "var(--skin-accent)", color: "#fff",
              fontSize: 12, fontWeight: 700,
              cursor: accepting ? "not-allowed" : "pointer",
              opacity: accepting ? 0.7 : 1,
            }}
          >
            Create Note or Task
          </button>
        </div>
      )}
    </div>
  );
}

// Nested task card under a committed objective
function NestedTaskCard({
  topic,
  isSaved,
  savedType,
  accepting,
  onDismiss,
  onCreateNoteOrTask,
  onOpen,
}: {
  topic: JournalTopic;
  isSaved: boolean;
  savedType?: EntityType;
  accepting: boolean;
  onDismiss: () => void;
  onCreateNoteOrTask: () => void;
  onOpen: () => void;
}) {
  const badgeLabel = isSaved
    ? (savedType === 'task' ? 'Task' : savedType === 'resource' ? 'Resource' : 'Note')
    : 'pending';

  return (
    <div style={{
      border: "1px solid var(--skin-line)",
      borderRadius: 12,
      padding: "14px 16px",
      background: "var(--skin-surface)",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--skin-ink)" }}>{topic.title}</span>
        <span style={{
          flexShrink: 0, padding: "3px 11px", borderRadius: 999,
          fontSize: 11, fontWeight: 600,
          background: "var(--skin-surface2)",
          color: isSaved ? "var(--skin-ink)" : "var(--skin-ink-soft)",
        }}>
          {badgeLabel}
        </span>
      </div>
      {topic.summary && (
        <p style={{ margin: "0 0 12px", fontSize: 13, lineHeight: 1.5, color: "var(--skin-ink-soft)" }}>
          {topic.summary}
        </p>
      )}
      {isSaved ? (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onOpen}
            style={{
              padding: "7px 18px", border: "none", borderRadius: 999,
              background: "var(--skin-accent)", color: "#fff",
              fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}
          >
            Open
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onDismiss}
            disabled={accepting}
            style={{
              padding: "7px 16px", border: "1px solid var(--skin-line)", borderRadius: 999,
              background: "var(--skin-surface)", color: "var(--skin-ink)",
              fontSize: 12, fontWeight: 600,
              cursor: accepting ? "not-allowed" : "pointer",
              opacity: accepting ? 0.5 : 1,
            }}
          >
            Dismiss
          </button>
          <button
            type="button"
            onClick={onCreateNoteOrTask}
            disabled={accepting}
            style={{
              padding: "7px 16px", border: "none", borderRadius: 999,
              background: "var(--skin-accent)", color: "#fff",
              fontSize: 12, fontWeight: 700,
              cursor: accepting ? "not-allowed" : "pointer",
              opacity: accepting ? 0.7 : 1,
            }}
          >
            Create Note or Task
          </button>
        </div>
      )}
    </div>
  );
}

export function JournalFlow({
  draft = null,
}: {
  draft?: { text: string; key: number } | null;
}) {
  const { user, loading } = useAuth();
  const { activeProjectId } = useActiveProject();
  const isMobile = useIsMobile();
  const { openEntity } = useRightPanel();
  const voice = useVoiceTranscription();
  const voiceBaseRef = useRef("");

  const [screen, setScreen] = useState<Screen>("input");
  const [entryText, setEntryText] = useState("");
  const [analysing, setAnalysing] = useState(false);
  const [topics, setTopics] = useState<JournalTopic[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [openSession, setOpenSession] = useState<string | null>(null);
  const [savedTopicIds, setSavedTopicIds] = useState<Set<string>>(new Set());
  const [savedTopicTargets, setSavedTopicTargets] = useState<Map<string, EntityPanelTarget>>(new Map());
  const [topicTypes, setTopicTypes] = useState<Map<string, EntityType>>(new Map());
  const [acceptingTopicId, setAcceptingTopicId] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [analysingMore, setAnalysingMore] = useState(false);
  const [parentMap, setParentMap] = useState<Map<string, string>>(new Map());
  const [creatingObjectiveId, setCreatingObjectiveId] = useState<string | null>(null);

  // Sync voice transcript into the textarea in real-time while recording
  useEffect(() => {
    if (voice.isListening && voice.transcript) {
      const sep = voiceBaseRef.current ? "\n\n" : "";
      setEntryText(voiceBaseRef.current + sep + voice.transcript);
    }
  }, [voice.transcript, voice.isListening]);

  const handleOrbClick = () => {
    if (voice.isListening) {
      voice.stop();
    } else {
      voiceBaseRef.current = entryText;
      voice.setTranscript("");
      voice.start();
    }
  };

  useEffect(() => {
    if (!draft) return;
    setEntryText(draft.text);
    setScreen("input");
  }, [draft]);

  const sessionsQuery = useQuery({
    queryKey: ["journal-sessions", user?.centralId],
    queryFn: () => listJournalSessions(user!.centralId),
    enabled: !!user,
  });

  const applyTopic = async (topic: JournalTopic, selectedType: EntityType): Promise<EntityPanelTarget | undefined> => {
    if (!user) return;
    const noteTypeMap: Record<EntityType, string> = {
      objective: 'note', task: 'task', note: 'note', resource: 'reference',
    };
    const hasProposals = topic.organiser_proposals.length > 0;
    const allProposalsAreNewObjective = topic.organiser_proposals.every(p => p.proposal_type === 'new_objective');
    const wouldFailWithoutObjective = hasProposals && allProposalsAreNewObjective && selectedType !== 'objective';
    let panelTarget: EntityPanelTarget | undefined;

    if (hasProposals && topic.organiser_session_id && !wouldFailWithoutObjective) {
      await confirmSession(
        topic.organiser_session_id,
        topic.organiser_proposals
          .filter(p => p.proposal_id)
          .map(p => ({
            proposal_id: p.proposal_id!,
            approved: true,
            ...resolveApprovalOverrides(selectedType, p.proposal_type),
          })),
      );
      const commitResult = await commitSession(topic.organiser_session_id);
      if (commitResult.failures?.length && !commitResult.results?.length) {
        throw new Error(commitResult.failures[0].error ?? 'Commit failed');
      }
      if (commitResult.results?.length) {
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
      toast.success("Saved and linked");
    } else {
      if (hasProposals && topic.organiser_session_id && wouldFailWithoutObjective) {
        await confirmSession(
          topic.organiser_session_id,
          topic.organiser_proposals.filter(p => p.proposal_id).map(p => ({ proposal_id: p.proposal_id!, approved: false })),
        ).catch(() => {});
      }
      const bodyHtml = `<p>${topic.summary.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br/>")}</p>`;
      const note = await createNote(user, { title: topic.title, bodyHtml, noteType: noteTypeMap[selectedType] ?? 'note' });
      panelTarget = { type: 'note', id: note.id };
      toast.success("Note saved");
    }
    return panelTarget;
  };

  const handleProcess = async () => {
    const text = entryText.trim();
    if (!text || !user) return;
    setAnalysing(true);
    try {
      const newTopics = await analyse({
        text,
        userId: user.centralId,
        tenantId: user.tenantId,
        projectId: activeProjectId ?? undefined,
      });
      setTopics(newTopics);
      setSavedTopicIds(new Set());
      setSavedTopicTargets(new Map());
      setParentMap(new Map());
      const initialTypes = new Map<string, EntityType>();
      for (const t of newTopics) initialTypes.set(t.id, defaultTopicEntityType(t));
      setTopicTypes(initialTypes);

      if (newTopics.length > 0) {
        const newSessionId = newTopics[0].organiser_session_id;
        setCurrentSessionId(newSessionId);
        setOpenSession(newSessionId);
        setScreen("history");
        void sessionsQuery.refetch();
      } else {
        toast("No topics found in this entry.");
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAnalysing(false);
    }
  };

  const handleDismissTopic = async (topic: JournalTopic) => {
    setTopics(prev => prev.filter(t => t.id !== topic.id));
    if (topic.organiser_proposals.length > 0 && topic.organiser_session_id) {
      try {
        await confirmSession(
          topic.organiser_session_id,
          topic.organiser_proposals
            .filter(p => p.proposal_id)
            .map(p => ({ proposal_id: p.proposal_id!, approved: false })),
        );
      } catch (e) {
        toast.error((e as Error).message);
      }
    }
  };

  const startNew = () => {
    if (voice.isListening) voice.stop();
    voice.setTranscript("");
    voiceBaseRef.current = "";
    setEntryText("");
    setTopics([]);
    setOpenSession(null);
    setSavedTopicIds(new Set());
    setSavedTopicTargets(new Map());
    setTopicTypes(new Map());
    setParentMap(new Map());
    setCurrentSessionId(null);
    setScreen("input");
  };

  const handleMoreSuggestions = async (text: string) => {
    if (!user) return;
    setAnalysingMore(true);
    try {
      const moreTopics = await analyse({
        text,
        userId: user.centralId,
        tenantId: user.tenantId,
        projectId: activeProjectId ?? undefined,
      });
      setTopicTypes(prev => {
        const m = new Map(prev);
        for (const t of moreTopics) m.set(t.id, defaultTopicEntityType(t));
        return m;
      });
      setTopics(prev => [...prev, ...moreTopics]);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAnalysingMore(false);
    }
  };

  const handleCreateObjectiveAndTasks = async (topic: JournalTopic) => {
    if (!user) return;
    setAcceptingTopicId(topic.id);
    try {
      const target = await applyTopic(topic, 'objective');
      setSavedTopicIds(prev => new Set([...prev, topic.id]));
      if (target) setSavedTopicTargets(prev => new Map(prev).set(topic.id, target));
      setTopicTypes(prev => new Map(prev).set(topic.id, 'objective'));

      setCreatingObjectiveId(topic.id);
      try {
        const nestedTopics = await analyse({
          text: entryText,
          userId: user.centralId,
          tenantId: user.tenantId,
          projectId: activeProjectId ?? undefined,
        });
        setParentMap(prev => {
          const m = new Map(prev);
          for (const t of nestedTopics) m.set(t.id, topic.id);
          return m;
        });
        setTopicTypes(prev => {
          const m = new Map(prev);
          for (const t of nestedTopics) m.set(t.id, 'task');
          return m;
        });
        setTopics(prev => [...prev, ...nestedTopics]);
      } finally {
        setCreatingObjectiveId(null);
      }

      if (target) openEntity(target);
      void sessionsQuery.refetch();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAcceptingTopicId(null);
    }
  };

  const handleCreateNoteOrTask = async (topic: JournalTopic) => {
    if (!user) return;
    setAcceptingTopicId(topic.id);
    try {
      const target = await applyTopic(topic, 'task');
      setSavedTopicIds(prev => new Set([...prev, topic.id]));
      if (target) setSavedTopicTargets(prev => new Map(prev).set(topic.id, target));
      setTopicTypes(prev => new Map(prev).set(topic.id, 'task'));
      if (target) openEntity(target);
      void sessionsQuery.refetch();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAcceptingTopicId(null);
    }
  };

  const handleMoreTasksForObjective = async (objectiveTopicId: string) => {
    if (!user) return;
    setCreatingObjectiveId(objectiveTopicId);
    try {
      const moreTopics = await analyse({
        text: entryText,
        userId: user.centralId,
        tenantId: user.tenantId,
        projectId: activeProjectId ?? undefined,
      });
      setParentMap(prev => {
        const m = new Map(prev);
        for (const t of moreTopics) m.set(t.id, objectiveTopicId);
        return m;
      });
      setTopicTypes(prev => {
        const m = new Map(prev);
        for (const t of moreTopics) m.set(t.id, 'task');
        return m;
      });
      setTopics(prev => [...prev, ...moreTopics]);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setCreatingObjectiveId(null);
    }
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
      <style>{`
        @keyframes jrnPulse {
          0%, 100% { box-shadow: 0 0 0 0 hsl(var(--primary, 180 60% 50%) / 0.35); }
          50% { box-shadow: 0 0 0 14px hsl(var(--primary, 180 60% 50%) / 0); }
        }
      `}</style>
      <div
        style={{
          display: isMobile ? "flex" : "grid",
          flexDirection: isMobile ? "column" : undefined,
          gridTemplateColumns: isMobile ? undefined : `${sidebarWidth}px 1fr`,
          minHeight: "70vh",
        }}
      >
        {/* Sidebar */}
        <aside
          style={{
            background: "var(--skin-surface)",
            borderRight: isMobile ? "none" : "1px solid var(--skin-line)",
            borderBottom: isMobile ? "1px solid var(--skin-line)" : "none",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            transition: "width 180ms ease",
          }}
        >
          {effCollapsed ? (
            <div style={{ padding: "16px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <button
                aria-label="Expand sidebar"
                title="Expand sidebar"
                style={{
                  height: 36, width: 36, padding: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: "1px solid var(--skin-line)", borderRadius: 7,
                  background: "var(--skin-surface)", cursor: "pointer",
                  color: "var(--skin-ink-soft)",
                }}
                onClick={() => setCollapsed(false)}
              >
                <PanelLeftOpen size={16} />
              </button>
              <button
                aria-label="New entry"
                title="New entry"
                style={{
                  height: 36, width: 36, padding: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: "none", borderRadius: 10,
                  background: "linear-gradient(90deg, #34acbf, #4de0c1)",
                  cursor: "pointer", color: "#fff",
                }}
                onClick={() => { startNew(); setCollapsed(false); }}
              >
                <Plus size={16} />
              </button>
            </div>
          ) : (
            <>
              <div style={{ padding: "18px 16px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--skin-ink)" }}>Journal</span>
                {!isMobile && (
                  <button
                    aria-label="Collapse sidebar"
                    title="Collapse sidebar"
                    style={{
                      height: 26, width: 26, padding: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      border: "1px solid var(--skin-line)", borderRadius: 7,
                      background: "var(--skin-surface)", cursor: "pointer",
                      color: "var(--skin-ink-soft)",
                    }}
                    onClick={() => setCollapsed(true)}
                  >
                    <PanelLeftClose size={14} />
                  </button>
                )}
              </div>

              <div style={{ padding: "0 16px 14px", flexShrink: 0 }}>
                <button
                  style={{
                    width: "100%", border: "none", borderRadius: 10,
                    padding: "10px 14px", fontSize: 14, fontWeight: 700,
                    color: "#fff", cursor: "pointer",
                    background: "linear-gradient(90deg, #34acbf, #4de0c1)",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  }}
                  onClick={startNew}
                >
                  <Plus size={15} />
                  New entry
                </button>
              </div>

              <div style={{ padding: "0 16px 8px", flexShrink: 0 }}>
                <button
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    width: "100%", border: "none", background: "transparent",
                    padding: 0, cursor: "pointer",
                    fontSize: 11, fontWeight: 700,
                    letterSpacing: "0.06em", textTransform: "uppercase",
                    color: "var(--skin-ink-faint)",
                  }}
                  onClick={() => setHistoryOpen(v => !v)}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" />
                  </svg>
                  History
                  <ChevronDown
                    size={12}
                    style={{
                      marginLeft: "auto",
                      transform: historyOpen ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 180ms",
                    }}
                  />
                </button>
              </div>

              {historyOpen && (
                <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                  {sessionsQuery.isLoading && (
                    <div style={{ fontSize: 12, color: "var(--skin-ink-faint)", padding: "4px 2px" }}>Loading…</div>
                  )}
                  {!sessionsQuery.isLoading && sessions.length === 0 && (
                    <div style={{ fontSize: 12, color: "var(--skin-ink-faint)", padding: "4px 2px" }}>No journal sessions yet.</div>
                  )}
                  {sessions.map(s => {
                    const isSelected = openSession === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => { setOpenSession(s.id); setScreen("history"); }}
                        style={{
                          width: "100%", textAlign: "left",
                          border: `1px solid ${isSelected ? "color-mix(in srgb, var(--skin-accent) 50%, var(--skin-line))" : "var(--skin-line)"}`,
                          background: isSelected ? "var(--skin-surface2)" : "transparent",
                          borderRadius: 10, padding: "10px 12px", cursor: "pointer",
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--skin-ink)" }}>
                          {new Date(s.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--skin-ink-soft)", marginTop: 2 }}>
                          {s.proposalCount} suggested / {s.committedCount} applied
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </aside>

        {/* Main pane */}
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0, minHeight: "70vh" }}>
          {screen === "input" && (
            <div style={{
              flex: 1,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: 20, padding: "32px 40px", overflowY: "auto",
            }}>
              <div style={{ textAlign: "center", maxWidth: 460 }}>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--skin-ink)" }}>
                  Record, type or paste a new entry.
                </h2>
                <p style={{ margin: "8px 0 0", fontSize: 14, color: "var(--skin-ink-soft)", lineHeight: 1.5 }}>
                  Talk about as many topics with as many details as you wish. Chi will understand where topics belong and help you organise it.
                </p>
              </div>

              <RecordOrb
                isListening={voice.isListening}
                onClick={handleOrbClick}
                supported={voice.supported}
              />

              <p style={{ margin: 0, fontSize: 13, color: "var(--skin-ink-soft)" }}>
                {voice.isListening
                  ? "Listening… tap to stop."
                  : voice.supported
                    ? "Tap to record, or type below."
                    : "Type or paste your entry below."}
              </p>

              <textarea
                className="x-input"
                style={{
                  width: "100%", maxWidth: 560, minHeight: 220,
                  boxSizing: "border-box", padding: 16,
                  fontSize: 14, lineHeight: 1.55, resize: "vertical",
                }}
                placeholder="… or input text here directly."
                value={entryText}
                readOnly={voice.isListening}
                onChange={e => setEntryText(e.target.value)}
                disabled={analysing}
              />

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "10px 18px",
                    border: "1px solid var(--skin-line)",
                    background: "var(--skin-surface)", borderRadius: 999,
                    fontSize: 13, fontWeight: 600, color: "var(--skin-ink)",
                    cursor: "pointer",
                  }}
                  onClick={startNew}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" />
                  </svg>
                  Start over
                </button>
                <button
                  type="button"
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "10px 20px", border: "none",
                    background: "var(--skin-accent)", borderRadius: 999,
                    fontSize: 13, fontWeight: 700, color: "#fff",
                    cursor: analysing || !entryText.trim() ? "not-allowed" : "pointer",
                    opacity: analysing || !entryText.trim() ? 0.6 : 1,
                  }}
                  onClick={handleProcess}
                  disabled={analysing || !entryText.trim()}
                >
                  {analysing ? (
                    <><Loader2 size={14} className="animate-spin" style={{ display: "inline" }} /> Analysing…</>
                  ) : (
                    <><Sparkles size={14} /> Send entry</>
                  )}
                </button>
              </div>
            </div>
          )}

          {screen === "history" && openSession && (
            <SessionHistoryView
              sessionId={openSession}
              entryText={entryText}
              liveTopics={openSession === currentSessionId ? topics : undefined}
              parentMap={parentMap}
              creatingObjectiveId={creatingObjectiveId}
              acceptingTopicId={acceptingTopicId}
              savedTopicIds={savedTopicIds}
              savedTopicTargets={savedTopicTargets}
              topicTypes={topicTypes}
              analysingMore={analysingMore}
              onMoreSuggestions={openSession === currentSessionId ? handleMoreSuggestions : undefined}
              onCreateObjectiveAndTasks={handleCreateObjectiveAndTasks}
              onCreateNoteOrTask={handleCreateNoteOrTask}
              onMoreTasksForObjective={handleMoreTasksForObjective}
              onDismiss={handleDismissTopic}
            />
          )}
        </div>
      </div>
    </>
  );
}

function SessionHistoryView({
  sessionId,
  entryText,
  liveTopics,
  parentMap,
  creatingObjectiveId,
  acceptingTopicId,
  savedTopicIds,
  savedTopicTargets,
  topicTypes,
  analysingMore,
  onMoreSuggestions,
  onCreateObjectiveAndTasks,
  onCreateNoteOrTask,
  onMoreTasksForObjective,
  onDismiss,
}: {
  sessionId: string;
  entryText: string;
  liveTopics?: JournalTopic[];
  parentMap?: Map<string, string>;
  creatingObjectiveId?: string | null;
  acceptingTopicId?: string | null;
  savedTopicIds?: Set<string>;
  savedTopicTargets?: Map<string, EntityPanelTarget>;
  topicTypes?: Map<string, EntityType>;
  analysingMore?: boolean;
  onMoreSuggestions?: (text: string) => Promise<void>;
  onCreateObjectiveAndTasks?: (topic: JournalTopic) => void;
  onCreateNoteOrTask?: (topic: JournalTopic) => void;
  onMoreTasksForObjective?: (objectiveTopicId: string) => void;
  onDismiss?: (topic: JournalTopic) => void;
}) {
  const { openEntity } = useRightPanel();
  const queryClient = useQueryClient();
  const hasLiveTopics = liveTopics !== undefined;

  const { data: historicalProposals, isLoading } = useQuery({
    queryKey: ["session-proposals", sessionId],
    queryFn: () => getSessionProposals(sessionId),
    enabled: !hasLiveTopics,
  });

  const sessionQuery = useQuery({
    queryKey: ["journal-session", sessionId],
    queryFn: () => getJournalSession(sessionId),
  });

  const originalText: string | null = typeof sessionQuery.data?.context?.text === "string"
    ? sessionQuery.data.context.text
    : null;

  const displayText = originalText ?? entryText ?? null;

  const rootTopics = liveTopics?.filter(t => !parentMap?.has(t.id)) ?? [];
  const childrenOf = (parentId: string): JournalTopic[] =>
    liveTopics?.filter(t => parentMap?.get(t.id) === parentId) ?? [];

  const handleHistoricalAccept = async (proposalId: string) => {
    try {
      await confirmSession(sessionId, [{ proposal_id: proposalId, approved: true }]);
      const commitResult = await commitSession(sessionId);
      await queryClient.invalidateQueries({ queryKey: ["session-proposals", sessionId] });
      toast.success('Applied.');
      if (commitResult.results?.length) {
        const first = commitResult.results[0];
        const type: EntityPanelTarget['type'] = first.proposal_type === 'new_objective' ? 'objective' : 'note';
        openEntity({ type, id: first.id, objectiveId: first.objective_id });
      }
    } catch {
      toast.error('Could not apply card.');
    }
  };

  const handleHistoricalDismiss = async (proposalId: string) => {
    try {
      await confirmSession(sessionId, [{ proposal_id: proposalId, approved: false }]);
      await queryClient.invalidateQueries({ queryKey: ["session-proposals", sessionId] });
      toast.success('Dismissed.');
    } catch {
      toast.error('Could not dismiss card.');
    }
  };

  const handleHistoricalGoTo = (proposal: HistoricalProposal) => {
    const committedId = proposal.payload.committed_entity_id as string | undefined;
    const committedType = proposal.payload.committed_entity_type as string | undefined;
    if (!committedId) return;
    const type: EntityPanelTarget['type'] =
      committedType === 'objective' ? 'objective' : committedType === 'task' ? 'task' : 'note';
    const objectiveId = proposal.payload.objective_id as string | undefined;
    openEntity({ type, id: committedId, objectiveId });
  };

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "24px 32px 32px", maxWidth: 760 }}>

      {/* Session entry read-only box */}
      <h3 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 700, color: "var(--skin-ink)" }}>
        Session entry
      </h3>
      <div
        style={{
          maxHeight: 150, overflowY: "auto",
          border: "1px solid var(--skin-line)", borderRadius: 10,
          padding: "14px 16px", marginBottom: 24,
          background: "var(--skin-surface)",
          fontSize: 14, lineHeight: 1.6,
          color: "var(--skin-ink)", whiteSpace: "pre-wrap",
        }}
      >
        {sessionQuery.isLoading
          ? <span style={{ color: "var(--skin-ink-faint)" }}>Loading…</span>
          : (displayText ?? <span style={{ color: "var(--skin-ink-faint)" }}>No entry text.</span>)}
      </div>

      {/* Session items header + create more link */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--skin-ink)" }}>
          Session items
        </h3>
        {onMoreSuggestions && displayText && (
          <button
            type="button"
            style={{
              display: "flex", alignItems: "center", gap: 6,
              border: "none", background: "transparent", padding: 0,
              cursor: analysingMore ? "not-allowed" : "pointer",
              fontSize: 13, fontWeight: 700, color: "var(--skin-accent)",
              opacity: analysingMore ? 0.5 : 1,
            }}
            onClick={() => onMoreSuggestions(displayText)}
            disabled={analysingMore}
          >
            <Sparkles size={14} />
            Create more items
          </button>
        )}
      </div>

      {/* Live (current session) topics */}
      {hasLiveTopics && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {rootTopics.map(topic => {
            const isSaved = savedTopicIds?.has(topic.id) ?? false;
            const savedType = topicTypes?.get(topic.id);
            const accepting = acceptingTopicId === topic.id;
            const isObjective = isSaved && savedType === 'objective';
            const children = childrenOf(topic.id);
            const isGeneratingChildren = creatingObjectiveId === topic.id;
            const target = savedTopicTargets?.get(topic.id);

            return (
              <div key={topic.id}>
                <JournalItemCard
                  topic={topic}
                  isSaved={isSaved}
                  savedType={savedType}
                  accepting={accepting}
                  onDismiss={() => onDismiss?.(topic)}
                  onCreateObjectiveAndTasks={() => onCreateObjectiveAndTasks?.(topic)}
                  onCreateNoteOrTask={() => onCreateNoteOrTask?.(topic)}
                  onOpen={() => { if (target) openEntity(target); }}
                />

                {isObjective && (
                  <div style={{
                    margin: "12px 0 0 22px",
                    paddingLeft: 18,
                    borderLeft: "2px solid var(--skin-line)",
                    display: "flex", flexDirection: "column", gap: 12,
                  }}>
                    <button
                      type="button"
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        border: "none", background: "transparent", padding: 0,
                        cursor: isGeneratingChildren ? "not-allowed" : "pointer",
                        fontSize: 12, fontWeight: 700, color: "var(--skin-accent)",
                        alignSelf: "flex-start",
                        opacity: isGeneratingChildren ? 0.5 : 1,
                      }}
                      onClick={() => onMoreTasksForObjective?.(topic.id)}
                      disabled={isGeneratingChildren}
                    >
                      <Sparkles size={13} />
                      {isGeneratingChildren ? "Generating tasks…" : "Create more tasks"}
                    </button>

                    {isGeneratingChildren && children.length === 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--skin-ink-faint)", fontSize: 13 }}>
                        <Loader2 size={14} className="animate-spin" />
                        Generating task suggestions…
                      </div>
                    )}

                    {children.map(child => {
                      const childSaved = savedTopicIds?.has(child.id) ?? false;
                      const childType = topicTypes?.get(child.id);
                      const childAccepting = acceptingTopicId === child.id;
                      const childTarget = savedTopicTargets?.get(child.id);
                      return (
                        <NestedTaskCard
                          key={child.id}
                          topic={child}
                          isSaved={childSaved}
                          savedType={childType}
                          accepting={childAccepting}
                          onDismiss={() => onDismiss?.(child)}
                          onCreateNoteOrTask={() => onCreateNoteOrTask?.(child)}
                          onOpen={() => { if (childTarget) openEntity(childTarget); }}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {analysingMore && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 0", color: "var(--skin-ink-faint)", fontSize: 13 }}>
              <Loader2 size={15} className="animate-spin" /> Loading more suggestions…
            </div>
          )}

          {rootTopics.length === 0 && !analysingMore && (
            <div style={{ padding: "32px 0", textAlign: "center", color: "var(--skin-ink-faint)", fontSize: 14 }}>
              All items processed. Use "Create more items" to generate additional suggestions.
            </div>
          )}
        </div>
      )}

      {/* Historical (past session) proposals */}
      {!hasLiveTopics && (
        <>
          {isLoading && <div style={{ color: "var(--skin-ink-faint)", fontSize: 14 }}>Loading…</div>}
          {!isLoading && (historicalProposals ?? []).length === 0 && (
            <div style={{ color: "var(--skin-ink-faint)", fontSize: 14 }}>No proposals in this session.</div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(historicalProposals ?? []).map(p => (
              <HistoricalProposalCard
                key={p.id}
                proposal={p}
                onAccept={handleHistoricalAccept}
                onDismiss={handleHistoricalDismiss}
                onGoTo={handleHistoricalGoTo}
              />
            ))}
          </div>
        </>
      )}
    </div>
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
    committed: { label: "Applied", bg: "color-mix(in srgb, var(--skin-accent) 12%, transparent)", fg: "var(--skin-accent)" },
    approved:  { label: "Approved", bg: "color-mix(in srgb, #22c55e 12%, transparent)", fg: "#22c55e" },
    pending:   { label: "Pending", bg: "color-mix(in srgb, var(--skin-ink-faint) 12%, transparent)", fg: "var(--skin-ink-faint)" },
    rejected:  { label: "Dismissed", bg: "color-mix(in srgb, var(--skin-danger, #d4524e) 10%, transparent)", fg: "var(--skin-danger, #d4524e)" },
  } as const;
  const cfg = statusConfig[proposal.status as keyof typeof statusConfig] ?? statusConfig.pending;
  const title = proposal.title ?? (proposal.payload.title as string | undefined) ?? "Untitled";
  const body = (proposal.payload.body_markdown as string | undefined) ?? (proposal.payload.description as string | undefined);
  const objectiveTitle = proposal.payload.objective_title as string | undefined;
  const hasGoTo = proposal.status === "committed" && !!proposal.payload.committed_entity_id;
  const showActions = proposal.status === "pending" || proposal.status === "approved" || hasGoTo;

  const isPending = proposal.status === "pending" || proposal.status === "approved";
  const typeLabel = proposal.proposal_type === 'new_objective' ? 'Objective' : proposal.proposal_type === 'add_note'
    ? ((proposal.payload.note_type as string | undefined) === 'task' ? 'Task' : 'Note')
    : proposal.proposal_type.replace(/_/g, " ");

  return (
    <div style={{
      border: "1px solid var(--skin-line)", borderRadius: 12,
      padding: "16px 18px", background: "var(--skin-surface)",
      opacity: proposal.status === "rejected" ? 0.6 : 1,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          {proposal.status === "committed" && <CheckCircle2 size={14} style={{ color: "var(--skin-accent)", flexShrink: 0 }} />}
          {proposal.status === "rejected" && <XCircle size={14} style={{ color: "var(--skin-danger, #d4524e)", flexShrink: 0 }} />}
          <span style={{ fontSize: 15, fontWeight: 700, color: "var(--skin-ink)" }}>{title}</span>
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <span style={{
            padding: "3px 11px", borderRadius: 999,
            fontSize: 11, fontWeight: 600,
            background: "var(--skin-surface2)", color: "var(--skin-ink)",
          }}>
            {typeLabel}
          </span>
          <span style={{ padding: "3px 11px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: cfg.bg, color: cfg.fg }}>
            {cfg.label}
          </span>
        </div>
      </div>
      {body && <p style={{ color: "var(--skin-ink-soft)", fontSize: 13, lineHeight: 1.5, margin: "0 0 10px" }}>{body}</p>}
      {objectiveTitle && <p style={{ fontSize: 12, color: "var(--skin-ink-faint)", margin: "0 0 10px" }}>→ {objectiveTitle}</p>}
      {showActions && (
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          {isPending && (
            <button
              disabled={busy}
              onClick={async () => { setBusy(true); await onDismiss(proposal.id); setBusy(false); }}
              style={{
                padding: "7px 16px", border: "1px solid var(--skin-line)", borderRadius: 999,
                background: "var(--skin-surface)", color: "var(--skin-ink)",
                fontSize: 12, fontWeight: 600,
                cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.5 : 1,
              }}
            >
              Dismiss
            </button>
          )}
          {isPending && (
            <button
              disabled={busy}
              onClick={async () => { setBusy(true); await onAccept(proposal.id); setBusy(false); }}
              style={{
                padding: "7px 16px", border: "none", borderRadius: 999,
                background: "var(--skin-accent)", color: "#fff",
                fontSize: 12, fontWeight: 700,
                cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.7 : 1,
              }}
            >
              {busy ? "Applying…" : "Apply"}
            </button>
          )}
          {hasGoTo && (
            <button
              onClick={() => onGoTo(proposal)}
              style={{
                padding: "7px 18px", border: "none", borderRadius: 999,
                background: "var(--skin-accent)", color: "#fff",
                fontSize: 12, fontWeight: 700, cursor: "pointer",
              }}
            >
              Open
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Keep unused import alive for backwards-compat exports
const _unusedResolvedPlacement = resolvedPlacement;
void _unusedResolvedPlacement;
