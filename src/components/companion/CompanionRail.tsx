import { useState, useEffect } from "react";
import { PanelRightOpen, Rocket, Zap, X, Search, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useSidepanel } from "@/contexts/sidepanel";
import { useAuth } from "@/contexts/auth";
import { useActiveProject } from "@/contexts/active-project";
import { useDebounce } from "@/hooks/useDebounce";
import { searchItems } from "@/lib/sidepanel-service";
import type { ItemKind } from "@/lib/sidepanel-service";
import { ItemBadge, ItemTypeChip } from "@/components/sidepanel/ItemBadge";

type InlinePanel = "detail" | "role" | "mood";

export const RAIL_PANEL_WIDTH = 480;
const TAB_WIDTH = 44;

const RAIL_ITEMS = [
  {
    key: "detail" as const,
    Icon: PanelRightOpen,
    title: "Detail panel",
    desc: "View, edit and add details to notes, tasks, objectives or projects.",
    mock: false,
  },
  {
    key: "role" as const,
    Icon: Rocket,
    title: "My role",
    desc: "Switch your mode between founder, collaborator or investor (paid plan).",
    mock: true,
  },
  {
    key: "mood" as const,
    Icon: Zap,
    title: "My mood",
    desc: "Some days you need guidance, on others you need depth.",
    mock: true,
  },
];

function RailTooltip({ title, desc, mock }: { title: string; desc: string; mock: boolean }) {
  return (
    <div
      style={{
        position: "absolute",
        right: "calc(100% + 10px)",
        top: "50%",
        transform: "translateY(-50%)",
        width: 240,
        background: "var(--skin-bg)",
        color: "var(--skin-ink)",
        border: "1px solid var(--skin-line)",
        borderRadius: 10,
        padding: "10px 12px",
        fontSize: 12,
        lineHeight: 1.45,
        boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
        pointerEvents: "none",
        zIndex: 40,
        whiteSpace: "normal",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 3, color: "var(--skin-ink)" }}>{title}</div>
      <div style={{ color: "var(--skin-ink-soft)" }}>{desc}</div>
      {mock && (
        <div
          style={{
            marginTop: 6,
            display: "inline-block",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--skin-accent)",
          }}
        >
          Not wired yet
        </div>
      )}
    </div>
  );
}

function RolePanel() {
  const ROLES = [
    { name: "Founder", note: "Full orchestration — objectives, value, completion." },
    { name: "Collaborator", note: "Your move, your tasks, your earnings." },
    { name: "Investor", note: "Provenance only. No edit affordances.", paid: true },
  ];
  return (
    <div style={{ padding: 20 }}>
      {ROLES.map((r) => (
        <div
          key={r.name}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "13px 14px",
            border: "1px solid var(--skin-line)",
            borderRadius: 10,
            marginBottom: 8,
            cursor: "default",
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: "linear-gradient(135deg, var(--skin-accent), #4F8EF7)",
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 13.5,
                fontWeight: 700,
                color: "var(--skin-ink)",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {r.name}
              {r.paid && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    background: "rgba(239,150,30,0.12)",
                    color: "var(--skin-warning, #B85E08)",
                    padding: "1px 6px",
                    borderRadius: 999,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  Paid
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: "var(--skin-ink-soft)", marginTop: 2 }}>{r.note}</div>
          </div>
        </div>
      ))}
      <p style={{ marginTop: 10, fontSize: 12, color: "var(--skin-ink-faint)", fontStyle: "italic" }}>
        Role switching is not wired yet.
      </p>
    </div>
  );
}

function MoodPanel() {
  const [val, setVal] = useState(50);
  const description =
    val < 40
      ? "Chi will lean toward step-by-step guidance and shorter check-ins."
      : val > 60
      ? "Chi will lean toward deeper analysis and fewer interruptions."
      : "Balanced — Chi adapts per message.";

  return (
    <div style={{ padding: 20 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 12,
          color: "var(--skin-ink-soft)",
          marginBottom: 8,
        }}
      >
        <span>Guidance</span>
        <span>Depth</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={val}
        onChange={(e) => setVal(Number(e.target.value))}
        style={{ width: "100%", accentColor: "var(--skin-accent)" }}
      />
      <p style={{ marginTop: 14, fontSize: 13, color: "var(--skin-ink-soft)", lineHeight: 1.5 }}>
        {description}
      </p>
      <p style={{ marginTop: 10, fontSize: 12, color: "var(--skin-ink-faint)", fontStyle: "italic" }}>
        Mood-adaptive tone is not wired yet.
      </p>
    </div>
  );
}

const TYPE_CHIPS = ["all", "objective", "note", "task", "idea", "question", "decision", "reference"] as const;

function DetailPanelSearch() {
  const sidepanel = useSidepanel();
  const { user } = useAuth();
  const { activeProjectId } = useActiveProject();
  const [query, setQuery] = useState("");
  const [activeType, setActiveType] = useState<string>("all");
  const debouncedQuery = useDebounce(query, 300);

  const kindsToSearch: ItemKind[] =
    activeType === "all" ? [] :
    activeType === "objective" ? ["objective"] :
    ["note"];

  const noteTypeFilter: string | null =
    activeType === "all" || activeType === "objective" || activeType === "note"
      ? null
      : activeType;

  const tenantId = user?.tenantId ?? "";

  const { data: results = [], isFetching } = useQuery({
    queryKey: ["detail-panel-search", debouncedQuery, activeType, activeProjectId, tenantId],
    queryFn: () =>
      searchItems(debouncedQuery, kindsToSearch, [], tenantId, {
        projectId: activeProjectId,
        noteType: noteTypeFilter,
      }),
    enabled: debouncedQuery.trim().length > 0 && tenantId.length > 0,
    staleTime: 30_000,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Search input */}
      <div style={{ padding: "12px 14px 8px", flexShrink: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "var(--skin-surface2)",
            border: "1px solid var(--skin-line)",
            borderRadius: 8,
            padding: "7px 10px",
          }}
        >
          {isFetching ? (
            <Loader2 size={14} className="animate-spin" style={{ color: "var(--skin-ink-faint)", flexShrink: 0 }} />
          ) : (
            <Search size={14} style={{ color: "var(--skin-ink-faint)", flexShrink: 0 }} />
          )}
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes, objectives…"
            autoFocus
            style={{
              flex: 1,
              border: "none",
              background: "transparent",
              outline: "none",
              fontSize: 13,
              color: "var(--skin-ink)",
              caretColor: "var(--skin-accent)",
            }}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--skin-ink-faint)", padding: 0, display: "flex" }}
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Type filter chips */}
      <div
        style={{
          display: "flex",
          gap: 6,
          padding: "0 14px 10px",
          flexWrap: "wrap",
          flexShrink: 0,
        }}
      >
        {TYPE_CHIPS.map((t) => (
          <ItemTypeChip
            key={t}
            typeKey={t}
            active={activeType === t}
            onClick={() => setActiveType(t)}
          />
        ))}
      </div>

      {/* Results */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 14px 14px" }}>
        {debouncedQuery.trim().length === 0 || tenantId.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 10, textAlign: "center", paddingTop: 32 }}>
            <PanelRightOpen size={24} style={{ color: "var(--skin-ink-faint)" }} />
            <p style={{ fontSize: 12, color: "var(--skin-ink-faint)", lineHeight: 1.5, maxWidth: 180 }}>
              Type to search for a note or objective to view its details.
            </p>
          </div>
        ) : results.length === 0 && !isFetching ? (
          <p style={{ fontSize: 13, color: "var(--skin-ink-faint)", textAlign: "center", marginTop: 24 }}>
            No matches.
          </p>
        ) : (
          results.map((item) => (
            <button
              key={item.id}
              onClick={() => sidepanel.open({ id: item.id, kind: item.kind, title: item.title })}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                textAlign: "left",
                background: "none",
                border: "none",
                borderRadius: 8,
                padding: "8px 10px",
                cursor: "pointer",
                marginBottom: 2,
                transition: "background 120ms ease",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--skin-surface2)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
            >
              <ItemBadge kind={item.kind} noteType={item.noteType} />
              <span style={{ flex: 1, fontSize: 13, color: "var(--skin-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {item.title}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export function CompanionRail({
  onPanelWidthChange,
}: {
  onPanelWidthChange?: (width: number) => void;
}) {
  const sidepanel = useSidepanel();
  const [activePanel, setActivePanel] = useState<InlinePanel | null>(null);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const openInlinePanel = (key: InlinePanel) => {
    setActivePanel(key);
    onPanelWidthChange?.(RAIL_PANEL_WIDTH);
  };

  const closeInlinePanel = () => {
    setActivePanel(null);
    onPanelWidthChange?.(0);
  };

  useEffect(() => {
    if (sidepanel.isOpen && activePanel === "detail") {
      setActivePanel(null);
      onPanelWidthChange?.(0);
    }
  }, [sidepanel.isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleIconClick = (key: (typeof RAIL_ITEMS)[number]["key"]) => {
    if (key === "detail") {
      if (sidepanel.isOpen) {
        sidepanel.close();
        return;
      }
      if (activePanel === "detail") {
        closeInlinePanel();
      } else {
        openInlinePanel("detail");
      }
      return;
    }
    if (activePanel === key) {
      closeInlinePanel();
    } else {
      openInlinePanel(key);
    }
  };

  // Collapsed tab is visible when no inline panel is open AND ItemSidepanel is not open
  const tabVisible = !activePanel && !sidepanel.isOpen;

  return (
    <>
      {/* Collapsed tab strip — one continuous pill, flush to right edge */}
      {tabVisible && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            right: 0,
            transform: "translateY(-50%)",
            display: "flex",
            flexDirection: "column",
            background: "var(--skin-surface)",
            borderRadius: "12px 0 0 12px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
            overflow: "visible",
            zIndex: 20,
          }}
        >
          {RAIL_ITEMS.map((item, i) => (
            <div
              key={item.key}
              style={{ position: "relative" }}
              onMouseEnter={() => setHoveredKey(item.key)}
              onMouseLeave={() => setHoveredKey(null)}
            >
              <button
                onClick={() => handleIconClick(item.key)}
                aria-label={item.title}
                style={{
                  width: TAB_WIDTH,
                  height: TAB_WIDTH,
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "transparent",
                  color: "var(--skin-ink-soft)",
                  borderBottom:
                    i < RAIL_ITEMS.length - 1 ? "1px solid var(--skin-line)" : "none",
                  borderRadius:
                    i === 0
                      ? "12px 0 0 0"
                      : i === RAIL_ITEMS.length - 1
                      ? "0 0 0 12px"
                      : 0,
                  transition: "color 0.15s, background 0.15s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--skin-accent)";
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "var(--skin-surface2)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--skin-ink-soft)";
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                }}
              >
                <item.Icon size={18} />
              </button>
              {hoveredKey === item.key && (
                <RailTooltip title={item.title} desc={item.desc} mock={item.mock} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Expanded inline panel (Role / Mood only — Detail uses ItemSidepanel Sheet) */}
      {activePanel && (
        <div
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            bottom: 0,
            width: RAIL_PANEL_WIDTH,
            maxWidth: "95vw",
            background: "var(--skin-surface)",
            boxShadow: "-8px 0 32px rgba(0,0,0,0.18)",
            zIndex: 20,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Panel header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              borderBottom: "1px solid var(--skin-line)",
              background: "var(--skin-surface2)",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                flex: 1,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--skin-ink-faint)",
              }}
            >
              {activePanel === "detail" ? "Detail" : activePanel === "role" ? "My role" : "My mood"}
            </span>
            <button
              onClick={closeInlinePanel}
              aria-label="Close panel"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--skin-ink-faint)",
                display: "flex",
                alignItems: "center",
                padding: 4,
                borderRadius: 4,
              }}
            >
              <X size={15} />
            </button>
          </div>

          {/* Panel body */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {activePanel === "detail" && <DetailPanelSearch />}
            {activePanel === "role" && <RolePanel />}
            {activePanel === "mood" && <MoodPanel />}
          </div>
        </div>
      )}
    </>
  );
}
