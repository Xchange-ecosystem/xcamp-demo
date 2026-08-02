import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth";
import { listObjectives, listNotes, listProjectsFull } from "@/lib/xcamp-api";

export type MentionCategory = 'objective' | 'project' | 'note' | 'task';

export interface MentionEntity {
  id: string;
  type: MentionCategory;
  title: string;
}

interface Props {
  isOpen: boolean;
  query: string;
  projectId?: string;
  onSelect: (entity: MentionEntity) => void;
  onClose: () => void;
  placement?: "above" | "below";
}

const CATEGORIES: { value: MentionCategory; label: string }[] = [
  { value: 'objective', label: 'Objectives' },
  { value: 'project', label: 'Projects' },
  { value: 'note', label: 'Notes' },
  { value: 'task', label: 'Tasks' },
];

export function MentionMenu({ isOpen, query, projectId, onSelect, onClose, placement = "above" }: Props) {
  const { user } = useAuth();
  const [category, setCategory] = useState<MentionCategory>(() =>
    projectId ? 'objective' : 'project'
  );
  const [allEntities, setAllEntities] = useState<MentionEntity[]>([]);
  const [loading, setLoading] = useState(false);

  // Reset to best default category when projectId changes
  useEffect(() => {
    setCategory(projectId ? 'objective' : 'project');
  }, [projectId]);

  // Load entities whenever category, projectId, or open state changes
  useEffect(() => {
    if (!isOpen || !user) return;
    let cancelled = false;
    setLoading(true);

    async function load() {
      try {
        let items: MentionEntity[] = [];
        if (category === 'objective') {
          if (projectId) {
            const objs = await listObjectives(user!, projectId);
            items = objs.map(o => ({ id: o.id, type: 'objective' as const, title: o.title }));
          }
        } else if (category === 'project') {
          const projs = await listProjectsFull(user!);
          items = projs.map(p => ({ id: p.id, type: 'project' as const, title: p.name }));
        } else if (category === 'note') {
          const notes = await listNotes(user!);
          items = notes
            .filter(n => n.note_type !== 'task')
            .map(n => ({ id: n.id, type: 'note' as const, title: n.title }));
        } else if (category === 'task') {
          const notes = await listNotes(user!);
          items = notes
            .filter(n => n.note_type === 'task')
            .map(n => ({ id: n.id, type: 'task' as const, title: n.title }));
        }
        if (!cancelled) setAllEntities(items);
      } catch {
        if (!cancelled) setAllEntities([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [isOpen, category, projectId, user]);

  if (!isOpen) return null;

  const filtered = query
    ? allEntities.filter(e => e.title.toLowerCase().includes(query.toLowerCase()))
    : allEntities;

  return (
    <div
      style={{
        position: 'absolute',
        ...(placement === "below"
          ? { top: '100%', marginTop: 6 }
          : { bottom: '100%', marginBottom: 6 }),
        left: 0,
        right: 0,
        borderRadius: 12,
        background: 'var(--glass-bubble-bg, rgba(18,18,28,0.92))',
        border: '1px solid var(--glass-border-color)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.36)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        zIndex: 200,
        overflow: 'hidden',
        maxHeight: 260,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Category tabs */}
      <div
        style={{
          display: 'flex',
          gap: 2,
          padding: '6px 8px',
          borderBottom: '1px solid var(--glass-divider, rgba(255,255,255,0.08))',
          flexShrink: 0,
          alignItems: 'center',
        }}
      >
        {CATEGORIES.map(cat => {
          const disabled = cat.value === 'objective' && !projectId;
          const active = category === cat.value;
          return (
            <button
              key={cat.value}
              onClick={() => !disabled && setCategory(cat.value)}
              title={disabled ? 'Select a project first' : undefined}
              style={{
                padding: '3px 9px',
                borderRadius: 6,
                border: 'none',
                background: active
                  ? 'var(--skin-accent, #4de0c1)'
                  : 'transparent',
                color: active
                  ? 'var(--skin-bg, #fff)'
                  : disabled
                  ? 'rgba(255,255,255,0.25)'
                  : 'var(--glass-text, rgba(255,255,255,0.75))',
                cursor: disabled ? 'default' : 'pointer',
                fontSize: 11,
                fontWeight: 500,
                opacity: disabled ? 0.45 : 1,
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              {cat.label}
            </button>
          );
        })}
        <div style={{ flex: 1 }} />
        <button
          onClick={onClose}
          aria-label="Close mention menu"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--glass-text, rgba(255,255,255,0.55))',
            fontSize: 16,
            padding: '0 4px',
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          ×
        </button>
      </div>

      {/* Entity list */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {loading ? (
          <div style={{ padding: '10px 14px', fontSize: 12, color: 'var(--glass-text-soft, rgba(255,255,255,0.45))' }}>
            Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '10px 14px', fontSize: 12, color: 'var(--glass-text-soft, rgba(255,255,255,0.45))' }}>
            {category === 'objective' && !projectId
              ? 'Select a project first to reference objectives'
              : query
              ? `No ${category}s match "${query}"`
              : `No ${category}s found`}
          </div>
        ) : (
          filtered.slice(0, 8).map(entity => (
            <button
              key={entity.id}
              onClick={() => onSelect(entity)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '8px 14px',
                border: 'none',
                borderBottom: '1px solid var(--glass-divider, rgba(255,255,255,0.05))',
                background: 'transparent',
                color: 'var(--glass-text, rgba(255,255,255,0.85))',
                cursor: 'pointer',
                fontSize: 13,
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
            >
              {entity.title}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
