import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { LayoutGrid, Share2, Users } from "lucide-react";
import { useSidepanel } from "@/contexts/sidepanel";
import { useInvestorEcosystem } from "@/contexts/investor-ecosystem";
import {
  getEcosystemById,
  getEcosystemHoverMetrics,
  getEcosystemNetwork,
  getEcosphereNetwork,
  getPersonById,
  getProjectById,
  getProjectsByEcosystem,
  getObjectiveById,
  getProjectAltitudeNetwork,
  type NetworkEdge,
  type NetworkNode,
} from "@/fixtures";
import { formatEUR } from "@/features/investor-portfolio/dealHelpers";
import { NavigatorAltitudeLever, type NavigatorAltitude } from "./NavigatorAltitudeLever";
import { NetworkCanvas, type CanvasEdge, type CanvasNode } from "./NetworkCanvas";
import {
  contributionCountForPerson,
  getObjectiveStatusColor,
  projectCountForPerson,
  radialLayout,
  tagsForPerson,
} from "./navigatorHelpers";

type NavigatorView = "grid" | "network";

// NetworkEdge (fixtures) uses sourceId/targetId; CanvasEdge (this feature's
// React-Flow wrapper) uses source/target to match React Flow's own Edge
// shape — this is the seam between the two naming conventions.
function toCanvasEdges(edges: NetworkEdge[]): CanvasEdge[] {
  return edges.map((e) => ({ id: e.id, source: e.sourceId, target: e.targetId }));
}

function personNode(
  personId: string,
  onClick: () => void,
  position: { x: number; y: number },
): CanvasNode {
  const person = getPersonById(personId);
  return {
    id: `node-person-${personId}`,
    kind: "person",
    label: person?.displayName ?? personId,
    sublabel: person?.role,
    color: "var(--skin-ink-faint)",
    position,
    onClick,
  };
}

export function EcosystemNavigatorScreen() {
  const navigate = useNavigate();
  const { open } = useSidepanel();
  const [ecosystemId, setEcosystemId] = useInvestorEcosystem();
  const [altitude, setAltitude] = useState<NavigatorAltitude>("ecosystem");
  const [view, setView] = useState<NavigatorView>("network");
  const [projectId, setProjectId] = useState<string | null>(null);

  const ecosystemProjects = useMemo(() => getProjectsByEcosystem(ecosystemId), [ecosystemId]);
  const effectiveProjectId = projectId ?? ecosystemProjects[0]?.id ?? null;

  const openPersonProfile = useCallback(
    (personId: string) => {
      const person = getPersonById(personId);
      if (!person) return;
      open({
        id: person.id,
        kind: "user",
        title: person.displayName,
        meta: {
          avatarUrl: person.avatarUrl,
          tags: tagsForPerson(person),
          projectCount: projectCountForPerson(person.id),
          contributionCount: contributionCountForPerson(person.id),
          bio: person.title,
        },
      });
    },
    [open],
  );

  const openGoal = useCallback(
    (objectiveId: string) => {
      const objective = getObjectiveById(objectiveId);
      if (!objective) return;
      open({ id: objective.id, kind: "objective", title: objective.title });
    },
    [open],
  );

  const { nodes, edges } = useMemo<{ nodes: CanvasNode[]; edges: CanvasEdge[] }>(() => {
    if (altitude === "ecosphere") {
      const { ecosystems, edges: ecoEdges } = getEcosphereNetwork();
      const positions = radialLayout([{ items: ecosystems, radius: 220 }], (e) => e.id);
      return {
        nodes: ecosystems.map((eco) => {
          const metrics = getEcosystemHoverMetrics(eco.id);
          return {
            id: eco.id,
            kind: "ecosystem",
            label: eco.name,
            sublabel: eco.region,
            color: eco.color,
            position: positions[eco.id],
            onClick: () => {
              setEcosystemId(eco.id);
              setAltitude("ecosystem");
            },
            tooltip: (
              <div>
                <div style={{ fontWeight: 700, color: "var(--skin-ink)", marginBottom: 4 }}>
                  {eco.name}
                </div>
                <div>{eco.description}</div>
                <div style={{ marginTop: 6 }}>
                  {metrics.projectCount} projects ({metrics.activeProjectCount} active)
                </div>
                <div>
                  Avg. match {metrics.avgMatchPct}% · Total ask {formatEUR(metrics.totalAskAmount)}
                </div>
              </div>
            ),
          } satisfies CanvasNode;
        }),
        edges: toCanvasEdges(ecoEdges),
      };
    }

    if (altitude === "project") {
      if (!effectiveProjectId) return { nodes: [], edges: [] };
      const { nodes: altNodes, edges: altEdges } = getProjectAltitudeNetwork(effectiveProjectId);
      const goals = altNodes.filter((n) => n.kind === "goal");
      const people = altNodes.filter((n) => n.kind === "person");
      const positions = radialLayout(
        [
          { items: goals, radius: 150 },
          { items: people, radius: 300 },
        ],
        (n) => n.id,
      );
      const canvasNodes: CanvasNode[] = [
        ...goals.map((g) => {
          const objective = getObjectiveById(g.refId);
          return {
            id: g.id,
            kind: "goal",
            label: objective?.title ?? g.refId,
            sublabel: objective?.status,
            color: objective ? getObjectiveStatusColor(objective.status) : "var(--skin-ink-faint)",
            position: positions[g.id],
            onClick: () => openGoal(g.refId),
          } satisfies CanvasNode;
        }),
        ...people.map((p) =>
          personNode(p.refId, () => openPersonProfile(p.refId), positions[p.id]),
        ),
      ];
      return { nodes: canvasNodes, edges: toCanvasEdges(altEdges) };
    }

    // altitude === "ecosystem"
    const { nodes: netNodes, edges: netEdges } = getEcosystemNetwork(ecosystemId);
    const projectNodes = netNodes.filter((n) => n.kind === "project");
    const peopleNodes = netNodes.filter((n) => n.kind === "person");
    const positions = radialLayout(
      [
        { items: projectNodes, radius: 160 },
        { items: peopleNodes, radius: 320 },
      ],
      (n: NetworkNode) => n.id,
    );
    const canvasNodes: CanvasNode[] = [
      ...projectNodes.map((n) => {
        const project = getProjectById(n.refId);
        return {
          id: n.id,
          kind: "project",
          label: project?.name ?? n.refId,
          color: project?.color ?? "var(--skin-accent)",
          position: positions[n.id],
          onClick: () =>
            void navigate({
              to: "/demo/investor/project/$projectId",
              params: { projectId: n.refId },
            }),
        } satisfies CanvasNode;
      }),
      ...peopleNodes.map((n) =>
        personNode(n.refId, () => openPersonProfile(n.refId), positions[n.id]),
      ),
    ];
    return { nodes: canvasNodes, edges: toCanvasEdges(netEdges) };
  }, [
    altitude,
    ecosystemId,
    effectiveProjectId,
    navigate,
    setEcosystemId,
    openGoal,
    openPersonProfile,
  ]);

  const ecosystem = getEcosystemById(ecosystemId);

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          padding: "20px 28px 14px",
          borderBottom: "1px solid var(--skin-line)",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: "var(--skin-ink)" }}>
            Ecosystem Navigator
          </h1>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--skin-ink-soft)" }}>
            {altitude === "ecosphere"
              ? "Every ecosystem, and how they connect."
              : altitude === "project"
                ? `${getProjectById(effectiveProjectId ?? "")?.name ?? "Project"} — users and goals`
                : `${ecosystem?.name ?? "Ecosystem"} — people and projects`}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {altitude === "project" && (
            <select
              className="x-input"
              value={effectiveProjectId ?? ""}
              onChange={(e) => setProjectId(e.target.value)}
              style={{ fontSize: 13, padding: "6px 10px" }}
            >
              {ecosystemProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}

          {altitude === "ecosystem" && (
            <div
              style={{
                display: "inline-flex",
                borderRadius: "var(--xr, 8px)",
                border: "1px solid var(--skin-line)",
                overflow: "hidden",
              }}
            >
              <button
                type="button"
                onClick={() => setView("network")}
                aria-pressed={view === "network"}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "7px 12px",
                  border: "none",
                  borderRight: "1px solid var(--skin-line)",
                  background: view === "network" ? "var(--skin-accent)" : "var(--skin-surface)",
                  color: view === "network" ? "var(--skin-on-accent)" : "var(--skin-ink-soft)",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                <Share2 size={14} />
                Network
              </button>
              <button
                type="button"
                onClick={() => setView("grid")}
                aria-pressed={view === "grid"}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "7px 12px",
                  border: "none",
                  background: view === "grid" ? "var(--skin-accent)" : "var(--skin-surface)",
                  color: view === "grid" ? "var(--skin-on-accent)" : "var(--skin-ink-soft)",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                <LayoutGrid size={14} />
                Grid
              </button>
            </div>
          )}

          <NavigatorAltitudeLever altitude={altitude} onChange={setAltitude} />
        </div>
      </div>

      {altitude === "ecosystem" && view === "grid" ? (
        <NavigatorGrid ecosystemId={ecosystemId} onOpenPerson={openPersonProfile} />
      ) : (
        <NetworkCanvas nodes={nodes} edges={edges} />
      )}
    </div>
  );
}

function NavigatorGrid({
  ecosystemId,
  onOpenPerson,
}: {
  ecosystemId: string;
  onOpenPerson: (personId: string) => void;
}) {
  const { nodes } = getEcosystemNetwork(ecosystemId);
  const people = nodes.filter((n) => n.kind === "person");

  if (people.length === 0) {
    return (
      <div style={{ padding: 32, color: "var(--skin-ink-faint)", fontSize: 14 }}>
        No members in this ecosystem yet.
      </div>
    );
  }

  return (
    <div style={{ padding: "20px 28px 40px", overflowY: "auto", flex: 1 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        {people.map((n) => {
          const person = getPersonById(n.refId);
          if (!person) return null;
          const tags = tagsForPerson(person);
          return (
            <button
              key={n.id}
              type="button"
              onClick={() => onOpenPerson(person.id)}
              style={{
                appearance: "none",
                border: "1px solid var(--skin-line)",
                borderRadius: 14,
                padding: 16,
                background: "var(--skin-surface)",
                cursor: "pointer",
                textAlign: "left",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                font: "inherit",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    flexShrink: 0,
                    background: "var(--skin-surface2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--skin-ink-faint)",
                  }}
                >
                  <Users size={18} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--skin-ink)" }}>
                    {person.displayName}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--skin-ink-faint)" }}>
                    {person.title}
                  </div>
                </div>
              </div>

              {tags.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {tags.map((t) => (
                    <span
                      key={t}
                      style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: "var(--skin-surface2)",
                        color: "var(--skin-ink-soft)",
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", gap: 16, marginTop: "auto" }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--skin-ink)" }}>
                    {projectCountForPerson(person.id)}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--skin-ink-soft)" }}>Projects</div>
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--skin-ink)" }}>
                    {contributionCountForPerson(person.id)}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--skin-ink-soft)" }}>Contributions</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
