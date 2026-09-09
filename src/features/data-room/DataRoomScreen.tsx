// Data Room (B4 Stage 3) — the evidence behind a project, once you have
// shortlisted it. First implementation: Phase 0 confirmed no Founder version
// exists to extend, and nothing in the repo had ever used the name.
//
// Access is the screen's organising idea, not a decoration. Club Deal Finder's
// Shortlist stage is described as "full view access — unlocks the project's
// Data Room", so that is literally where the gate reads from: both screens
// consume INITIAL_DEAL_STAGES, and a watchlist-stage project is listed here
// but locked. Deep-linked from a shortlisted card via ?project=<id>.
//
// Documents are display-only. Nothing downloads, because nothing exists to
// download — showing a working download control over fixture rows would be a
// lie the rest of the demo doesn't tell.
import { useMemo, useState } from "react";
import { FileText, Lock, ShieldCheck } from "lucide-react";
import {
  getDataRoomDocuments,
  isDataRoomUnlocked,
  type DataRoomDocKind,
  type DataRoomDocument,
} from "@/fixtures/dataRoom";
import { INITIAL_DEAL_STAGES } from "@/fixtures/clubDeals";
import { OBJECTIVES } from "@/fixtures/objectives";
import { PROJECTS } from "@/fixtures/projects";

const KIND_LABEL: Record<DataRoomDocKind, string> = {
  report: "Report",
  certificate: "Certificate",
  dataset: "Dataset",
  model: "Model",
  contract: "Contract",
  deck: "Deck",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function DataRoomScreen({ initialProjectId }: { initialProjectId?: string }) {
  const unlocked = useMemo(() => PROJECTS.filter((p) => isDataRoomUnlocked(p.id)), []);
  const locked = useMemo(() => PROJECTS.filter((p) => !isDataRoomUnlocked(p.id)), []);

  const [selectedId, setSelectedId] = useState<string>(() => {
    if (initialProjectId && isDataRoomUnlocked(initialProjectId)) return initialProjectId;
    return unlocked[0]?.id ?? "";
  });

  const selected = PROJECTS.find((p) => p.id === selectedId);
  // Memoized so the grouping below actually caches — recomputing this inline
  // gave it a new array identity every render.
  const documents = useMemo(
    () => (selectedId ? getDataRoomDocuments(selectedId) : []),
    [selectedId],
  );

  // Group by the objective each document evidences — provenance first, file
  // type second. Project-level material sits in its own group at the end.
  const groups = useMemo(() => {
    const byObjective = new Map<string, DataRoomDocument[]>();
    const projectLevel: DataRoomDocument[] = [];
    for (const doc of documents) {
      if (!doc.objectiveId) {
        projectLevel.push(doc);
        continue;
      }
      byObjective.set(doc.objectiveId, [...(byObjective.get(doc.objectiveId) ?? []), doc]);
    }
    const objectiveGroups = [...byObjective.entries()].map(([objectiveId, docs]) => ({
      key: objectiveId,
      title: OBJECTIVES.find((o) => o.id === objectiveId)?.title ?? objectiveId,
      docs,
    }));
    return projectLevel.length
      ? [...objectiveGroups, { key: "project", title: "Project-level", docs: projectLevel }]
      : objectiveGroups;
  }, [documents]);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
      <h1 className="mb-1.5 text-xl font-semibold tracking-tight text-foreground">Data Room</h1>
      <p className="mb-5 text-sm text-muted-foreground">
        Evidence filed against each objective, for the projects you have shortlisted. Shortlist a
        project in Club Deal Finder to open its room.
      </p>

      {/* Project picker — unlocked rooms only. */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
        {unlocked.map((project) => {
          const active = project.id === selectedId;
          return (
            <button
              key={project.id}
              type="button"
              aria-pressed={active}
              onClick={() => setSelectedId(project.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "5px 11px",
                fontSize: 12.5,
                borderRadius: "var(--xr-pill, 999px)",
                border: `1px solid ${active ? "var(--skin-accent)" : "var(--skin-line)"}`,
                background: active ? "var(--skin-accent-soft)" : "var(--skin-surface)",
                color: "var(--skin-ink)",
                cursor: "pointer",
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: project.color,
                  flexShrink: 0,
                }}
              />
              {project.name}
            </button>
          );
        })}
      </div>

      {/* Locked rooms, stated rather than hidden — the gate is the feature. */}
      {locked.length > 0 && (
        <p
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            color: "var(--skin-ink-faint)",
            margin: "0 0 22px",
          }}
        >
          <Lock size={12} />
          Locked, still on your watchlist: {locked.map((p) => p.name).join(", ")}
        </p>
      )}

      {selected && (
        <div style={{ maxWidth: 780 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 9, marginBottom: 14 }}>
            <h2
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 600,
                color: "var(--skin-ink)",
                fontFamily: "var(--skin-font-head)",
              }}
            >
              {selected.name}
            </h2>
            <span style={{ fontSize: 12.5, color: "var(--skin-ink-faint)" }}>
              {documents.length} document{documents.length === 1 ? "" : "s"} ·{" "}
              {INITIAL_DEAL_STAGES[selected.id]} stage
            </span>
          </div>

          {groups.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--skin-ink-faint)" }}>
              Nothing has been filed for this project yet.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {groups.map((group) => (
                <section key={group.key}>
                  <h3
                    style={{
                      margin: "0 0 7px",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--skin-ink-faint)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {group.title}
                  </h3>
                  <div
                    style={{
                      border: "1px solid var(--skin-line)",
                      borderRadius: "var(--xr-lg, 10px)",
                      overflow: "hidden",
                      background: "var(--skin-surface)",
                    }}
                  >
                    {group.docs.map((doc, i) => (
                      <DocumentRow key={doc.id} doc={doc} first={i === 0} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DocumentRow({ doc, first }: { doc: DataRoomDocument; first: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "9px 12px",
        borderTop: first ? "none" : "1px solid var(--skin-line-soft)",
      }}
    >
      <FileText size={15} style={{ color: "var(--skin-ink-faint)", flexShrink: 0 }} />
      <span
        style={{
          minWidth: 0,
          flex: 1,
          fontSize: 13.5,
          color: "var(--skin-ink)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {doc.name}
      </span>
      {doc.externallyAssessed && (
        <span
          className="inline-flex items-center gap-1"
          title="Signed off by an external assessor"
          style={{
            flexShrink: 0,
            fontSize: 11,
            padding: "1px 7px",
            borderRadius: "var(--xr-pill, 999px)",
            border: "1px solid var(--skin-line)",
            color: "var(--skin-ink-soft)",
          }}
        >
          <ShieldCheck size={11} />
          Four-eyes
        </span>
      )}
      <span
        style={{
          flexShrink: 0,
          width: 84,
          fontSize: 11.5,
          color: "var(--skin-ink-faint)",
        }}
      >
        {KIND_LABEL[doc.kind]}
      </span>
      <span
        className="tabular-nums"
        style={{ flexShrink: 0, width: 62, fontSize: 11.5, color: "var(--skin-ink-faint)" }}
      >
        {doc.sizeLabel}
      </span>
      <span
        className="tabular-nums"
        style={{
          flexShrink: 0,
          width: 96,
          textAlign: "right",
          fontSize: 11.5,
          color: "var(--skin-ink-faint)",
        }}
      >
        {formatDate(doc.addedAt)}
      </span>
    </div>
  );
}
