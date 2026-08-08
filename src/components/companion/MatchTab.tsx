import { useState } from "react";
import { RefreshCw, Search, ChevronDown, ChevronRight, Users, Building2, FileText } from "lucide-react";
import type { MatchSubtab } from "@/store/companionPanelStore";

interface MatchTabProps {
  subtab: MatchSubtab;
  onSubtabChange: (s: MatchSubtab) => void;
}

// ─── Mocked connection data ───────────────────────────────────────────────────

interface MockConnection {
  id: string;
  name: string;
  description: string;
  relevance: 'high' | 'medium';
}

const MOCK_CONNECTIONS: Record<string, { label: string; icon: React.ElementType; items: MockConnection[] }> = {
  people: {
    label: 'People',
    icon: Users,
    items: [
      { id: 'p1', name: 'Alex Chen', description: 'Product Lead — mentioned in Q3 planning note', relevance: 'high' },
      { id: 'p2', name: 'Sarah Kim', description: 'Engineering — flagged in sprint review', relevance: 'medium' },
    ],
  },
  organizations: {
    label: 'Organizations',
    icon: Building2,
    items: [
      { id: 'o1', name: 'Partner Co', description: 'Referenced in integration objective', relevance: 'medium' },
    ],
  },
  references: {
    label: 'References',
    icon: FileText,
    items: [
      { id: 'r1', name: 'Q3 Strategy Doc', description: 'Linked to active objective', relevance: 'high' },
      { id: 'r2', name: 'Competitive Analysis', description: 'Relevant to current sprint context', relevance: 'medium' },
    ],
  },
};

function ConnectionGroup({
  groupKey,
  group,
}: {
  groupKey: string;
  group: { label: string; icon: React.ElementType; items: MockConnection[] };
}) {
  const [open, setOpen] = useState(true);
  const Icon = group.icon;

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
        <Icon size={11} />
        {group.label}
        <span style={{ marginLeft: 'auto' }}>
          {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        </span>
      </button>

      {open && group.items.map((item) => (
        <div
          key={item.id}
          style={{
            padding: '10px 12px',
            background: 'var(--glass-card-bg, rgba(255,255,255,0.05))',
            border: '1px solid var(--glass-border-color, rgba(255,255,255,0.09))',
            borderRadius: 7,
            display: 'flex', flexDirection: 'column', gap: 3,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--glass-text)' }}>{item.name}</span>
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
              padding: '2px 6px', borderRadius: 4,
              color: item.relevance === 'high' ? 'var(--skin-accent, #4de0c1)' : 'var(--glass-text-soft)',
              background: item.relevance === 'high' ? 'rgba(77,224,193,0.12)' : 'rgba(255,255,255,0.06)',
            }}>
              {item.relevance}
            </span>
          </div>
          <span style={{ fontSize: 12, color: 'var(--glass-text-soft)', lineHeight: 1.4 }}>{item.description}</span>
        </div>
      ))}
    </div>
  );
}

function ConnectionsSubtab() {
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
        <span style={{ fontSize: 11, color: 'var(--glass-text-soft)' }}>
          Matched to current project context
        </span>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          aria-label="Refresh connections"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--glass-text-soft)', padding: 4, opacity: isRefreshing ? 0.4 : 0.8 }}
        >
          <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      <div key={refreshKey} style={{ flex: 1, overflowY: 'auto', padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {Object.entries(MOCK_CONNECTIONS).map(([key, group]) => (
          <ConnectionGroup key={key} groupKey={key} group={group} />
        ))}
      </div>
    </div>
  );
}

function ResourcesSubtab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 12, padding: '32px 20px', textAlign: 'center' }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid var(--glass-border-color, rgba(255,255,255,0.1))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--glass-text-soft)',
      }}>
        <Search size={20} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--glass-text)' }}>Web search coming soon</span>
        <span style={{ fontSize: 12, color: 'var(--glass-text-soft)', lineHeight: 1.5, maxWidth: 200 }}>
          Real-time resource discovery will appear here once a web search provider is wired.
        </span>
      </div>
    </div>
  );
}

export function MatchTab({ subtab, onSubtabChange }: MatchTabProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* Subtab pills */}
      <div style={{ display: 'flex', gap: 4, padding: '10px 12px 8px', flexShrink: 0 }}>
        {(['connections', 'resources'] as MatchSubtab[]).map((s) => (
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
            {s === 'connections' ? 'Connections' : 'Resources'}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {subtab === 'connections' ? <ConnectionsSubtab /> : <ResourcesSubtab />}
      </div>
    </div>
  );
}
