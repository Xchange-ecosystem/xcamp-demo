import { useState } from "react";
import { RefreshCw, ChevronDown, ChevronRight, FileText, Bot, Clock } from "lucide-react";
import type { ActionsSubtab } from "@/store/companionPanelStore";

interface ActionsTabProps {
  subtab: ActionsSubtab;
  onSubtabChange: (s: ActionsSubtab) => void;
}

// ─── Mocked artefact data ─────────────────────────────────────────────────────

interface MockArtefact {
  id: string;
  name: string;
  type: string;
  age: string;
}

const MOCK_ARTEFACTS: MockArtefact[] = [
  { id: 'a1', name: 'Executive Summary', type: 'Document', age: '5 min ago' },
  { id: 'a2', name: 'Project Charter', type: 'Document', age: '2 hours ago' },
  { id: 'a3', name: 'Sprint Review Notes', type: 'Note', age: '1 day ago' },
];

// ─── Mocked agent data ────────────────────────────────────────────────────────

interface MockAgent {
  id: string;
  name: string;
  status: 'idle' | 'running';
}

const MOCK_AGENTS: Record<string, { label: string; agents: MockAgent[] }> = {
  research: {
    label: 'Research',
    agents: [
      { id: 'ag1', name: 'Market Research Agent', status: 'idle' },
      { id: 'ag2', name: 'Competitor Analysis Agent', status: 'running' },
    ],
  },
  writing: {
    label: 'Writing',
    agents: [
      { id: 'ag3', name: 'Report Drafting Agent', status: 'idle' },
      { id: 'ag4', name: 'Email Composer Agent', status: 'idle' },
    ],
  },
};

function ArtefactsSubtab() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setRefreshKey((k) => k + 1);
    setTimeout(() => setIsRefreshing(false), 800);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: 'var(--glass-text-soft)' }}>Newest first</span>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          aria-label="Refresh artefacts"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--glass-text-soft)', padding: 4, opacity: isRefreshing ? 0.4 : 0.8 }}
        >
          <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      <div key={refreshKey} style={{ flex: 1, overflowY: 'auto', padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {MOCK_ARTEFACTS.map((a) => (
          <div
            key={a.id}
            style={{
              padding: '10px 12px',
              background: 'var(--glass-card-bg, rgba(255,255,255,0.05))',
              border: '1px solid var(--glass-border-color, rgba(255,255,255,0.09))',
              borderRadius: 7,
              display: 'flex', alignItems: 'center', gap: 10,
            }}
          >
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FileText size={14} color="var(--glass-text-soft)" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--glass-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {a.name}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <span style={{ fontSize: 10, color: 'var(--glass-text-soft)' }}>{a.type}</span>
                <span style={{ fontSize: 10, color: 'var(--glass-text-soft)', opacity: 0.5 }}>·</span>
                <Clock size={9} color="var(--glass-text-soft)" style={{ opacity: 0.6 }} />
                <span style={{ fontSize: 10, color: 'var(--glass-text-soft)' }}>{a.age}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AgentGroup({ group }: { group: { label: string; agents: MockAgent[] } }) {
  const [open, setOpen] = useState(true);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--glass-text-soft)',
          fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
          padding: '4px 2px',
          textAlign: 'left',
        }}
      >
        <Bot size={11} />
        {group.label}
        <span style={{ marginLeft: 'auto' }}>
          {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        </span>
      </button>

      {open && group.agents.map((agent) => (
        <div
          key={agent.id}
          style={{
            padding: '10px 12px',
            background: 'var(--glass-card-bg, rgba(255,255,255,0.05))',
            border: '1px solid var(--glass-border-color, rgba(255,255,255,0.09))',
            borderRadius: 7,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--glass-text)' }}>{agent.name}</span>
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
            padding: '2px 7px', borderRadius: 4,
            color: agent.status === 'running' ? 'var(--skin-accent, #4de0c1)' : 'var(--glass-text-soft)',
            background: agent.status === 'running' ? 'rgba(77,224,193,0.14)' : 'rgba(255,255,255,0.06)',
          }}>
            {agent.status}
          </span>
        </div>
      ))}
    </div>
  );
}

function AgentsSubtab() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setRefreshKey((k) => k + 1);
    setTimeout(() => setIsRefreshing(false), 800);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: 'var(--glass-text-soft)' }}>By type</span>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          aria-label="Refresh agents"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--glass-text-soft)', padding: 4, opacity: isRefreshing ? 0.4 : 0.8 }}
        >
          <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      <div key={refreshKey} style={{ flex: 1, overflowY: 'auto', padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {Object.values(MOCK_AGENTS).map((group) => (
          <AgentGroup key={group.label} group={group} />
        ))}
      </div>
    </div>
  );
}

export function ActionsTab({ subtab, onSubtabChange }: ActionsTabProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* Subtab pills */}
      <div style={{ display: 'flex', gap: 4, padding: '10px 12px 8px', flexShrink: 0 }}>
        {(['artefacts', 'agents'] as ActionsSubtab[]).map((s) => (
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
            {s === 'artefacts' ? 'Artefacts' : 'Agents'}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {subtab === 'artefacts' ? <ArtefactsSubtab /> : <AgentsSubtab />}
      </div>
    </div>
  );
}
