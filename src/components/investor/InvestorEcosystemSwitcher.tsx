// src/components/investor/InvestorEcosystemSwitcher.tsx
//
// Investor nav's ecosystem/project switcher — generalized one level up from
// the functional app's Ecosystem/Project segmented control
// (AppSidebarExperimental.tsx: two segments, click-to-switch-mode on
// Ecosystem, click-to-reopen-or-switch on Project) with an extra dropdown on
// the Ecosystem segment itself, since this persona has more than one
// ecosystem to choose between. No search box on either dropdown, unlike
// the original — with 3 ecosystems and at most 10 projects there's nothing
// for a search box to do yet.
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Check, ChevronDown } from "lucide-react";
import { ECOSYSTEMS, getProjectsByEcosystem } from "@/fixtures";

interface InvestorEcosystemSwitcherProps {
  ecosystemId: string;
  onSelectEcosystem: (id: string) => void;
  activeProjectId: string | null;
  activeProjectName?: string;
}

const segmentStyle = (active: boolean): React.CSSProperties => ({
  flex: 1,
  minWidth: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 4,
  padding: "6px 10px",
  background: active ? "var(--skin-accent)" : "transparent",
  color: active ? "var(--skin-bg, #0a0a0a)" : "var(--skin-ink-soft)",
  border: "none",
  cursor: "pointer",
  transition: "background 0.15s, color 0.15s",
  fontSize: 12,
  fontWeight: 500,
});

const dropdownStyle: React.CSSProperties = {
  position: "absolute",
  left: 0,
  right: 0,
  top: "calc(100% + 4px)",
  background: "var(--skin-surface)",
  border: "1px solid var(--skin-line)",
  borderRadius: 8,
  boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
  zIndex: 50,
  overflow: "hidden",
};

const dropdownItemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  width: "100%",
  padding: "8px 10px",
  border: "none",
  background: "transparent",
  cursor: "pointer",
  fontSize: 12,
  color: "var(--skin-ink)",
  textAlign: "left",
};

export function InvestorEcosystemSwitcher({
  ecosystemId,
  onSelectEcosystem,
  activeProjectId,
  activeProjectName,
}: InvestorEcosystemSwitcherProps) {
  const navigate = useNavigate();
  const [ecoOpen, setEcoOpen] = useState(false);
  const [projOpen, setProjOpen] = useState(false);

  const ecosystem = ECOSYSTEMS.find((e) => e.id === ecosystemId) ?? ECOSYSTEMS[0];
  const projects = getProjectsByEcosystem(ecosystemId);
  const inProjectMode = !!activeProjectId;

  function closeMenus() {
    setEcoOpen(false);
    setProjOpen(false);
  }

  function handleEcosystemSegmentClick() {
    if (inProjectMode) {
      // "Ecosystem always switches mode" — same rule as the source pattern.
      closeMenus();
      void navigate({ to: "/demo/investor" });
      return;
    }
    setProjOpen(false);
    setEcoOpen((v) => !v);
  }

  function handlePickEcosystem(id: string) {
    onSelectEcosystem(id);
    closeMenus();
    void navigate({ to: "/demo/investor" });
  }

  function handleProjectSegmentClick() {
    if (inProjectMode) {
      setEcoOpen(false);
      setProjOpen((v) => !v);
      return;
    }
    setEcoOpen(false);
    setProjOpen((v) => !v);
  }

  function handlePickProject(id: string) {
    closeMenus();
    void navigate({ to: "/demo/investor/project/$projectId", params: { projectId: id } });
  }

  return (
    <div style={{ position: "relative", marginTop: -4 }}>
      <div
        style={{
          display: "flex",
          borderRadius: 8,
          border: "1px solid var(--skin-line)",
          overflow: "hidden",
        }}
      >
        <button
          type="button"
          onClick={handleEcosystemSegmentClick}
          title={ecosystem.name}
          style={segmentStyle(!inProjectMode)}
        >
          <span
            style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}
          >
            {ecosystem.name}
          </span>
          <ChevronDown size={12} style={{ flexShrink: 0, opacity: 0.7 }} />
        </button>
        <div style={{ width: 1, background: "var(--skin-line)", flexShrink: 0 }} />
        <button
          type="button"
          onClick={handleProjectSegmentClick}
          title={activeProjectName ?? "Select project"}
          style={segmentStyle(inProjectMode)}
        >
          <span
            style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}
          >
            {activeProjectName ?? "Select project"}
          </span>
          <ChevronDown size={12} style={{ flexShrink: 0, opacity: 0.7 }} />
        </button>
      </div>

      {ecoOpen && (
        <div style={dropdownStyle}>
          {ECOSYSTEMS.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => handlePickEcosystem(e.id)}
              style={dropdownItemStyle}
            >
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {e.name}
              </span>
              {e.id === ecosystemId && (
                <Check size={13} style={{ color: "var(--skin-accent)", flexShrink: 0 }} />
              )}
            </button>
          ))}
        </div>
      )}

      {projOpen && (
        <div style={dropdownStyle}>
          {projects.length === 0 ? (
            <div style={{ padding: "10px 12px", fontSize: 12, color: "var(--skin-ink-faint)" }}>
              No projects in this ecosystem yet
            </div>
          ) : (
            <div style={{ maxHeight: 220, overflowY: "auto" }}>
              {projects.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePickProject(p.id)}
                  style={dropdownItemStyle}
                >
                  <span
                    style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                  >
                    {p.name}
                  </span>
                  {p.id === activeProjectId && (
                    <Check size={13} style={{ color: "var(--skin-accent)", flexShrink: 0 }} />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {(ecoOpen || projOpen) && (
        <div style={{ position: "fixed", inset: 0, zIndex: 49 }} onClick={closeMenus} aria-hidden />
      )}
    </div>
  );
}
