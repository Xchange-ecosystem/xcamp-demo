import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import { useAuth } from "@/contexts/auth";
import { usePersona, type Persona } from "@/store/personaStore";
import {
  fetchProjectObjectiveProgress,
  listProjectsForPortfolio,
  type ProjectPortfolioItem,
} from "@/lib/xcamp-api";
import { listWatchlist } from "@/lib/watchlist-api";
import { PortfolioProjectCard } from "./PortfolioProjectCard";
import { ProjectStubPanel } from "./ProjectStubPanel";

type AudienceTab = "overview" | "marketplace" | "investor";
type ProjectTab = "all" | "owned" | "collaborations" | "watchlist" | "viewer";
type SortKey = "name_asc" | "name_desc" | "obj_most" | "obj_least";

const SORT_LABELS: Record<SortKey, string> = {
  name_asc: "Name A → Z",
  name_desc: "Name Z → A",
  obj_most: "Most objectives",
  obj_least: "Fewest objectives",
};

const PROJECT_TAB_LABELS: Record<ProjectTab, string> = {
  all: "All",
  owned: "Owned by me",
  collaborations: "Collaborations",
  watchlist: "Watchlist",
  viewer: "Viewer",
};

// Which of the 5 tabs each persona sees, and where they land by default.
// A persisted/previous tab that isn't in this persona's list falls back to the default.
const TABS_BY_PERSONA: Record<Persona, ProjectTab[]> = {
  founder: ["owned", "collaborations", "viewer"],
  investor: ["all", "watchlist", "viewer"],
  collaborator: ["collaborations", "viewer"],
};

const DEFAULT_TAB_BY_PERSONA: Record<Persona, ProjectTab> = {
  founder: "owned",
  investor: "all",
  collaborator: "collaborations",
};

function isProjectTab(t: string): t is ProjectTab {
  return t in PROJECT_TAB_LABELS;
}

export function PortfolioView({ initialTab }: { initialTab?: string } = {}) {
  const { user } = useAuth();
  const { persona } = usePersona();
  const [audience, setAudience] = useState<AudienceTab>("overview");
  const [activeTab, setActiveTab] = useState<ProjectTab>(() => {
    if (initialTab && isProjectTab(initialTab) && TABS_BY_PERSONA[persona].includes(initialTab)) {
      return initialTab;
    }
    return DEFAULT_TAB_BY_PERSONA[persona];
  });
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("name_asc");
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  // Close sort dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // If the active tab isn't visible for the current persona (switched via the rail,
  // or restored from a previous session), fall back to that persona's default tab.
  useEffect(() => {
    if (!TABS_BY_PERSONA[persona].includes(activeTab)) {
      setActiveTab(DEFAULT_TAB_BY_PERSONA[persona]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persona]);

  const projectsQuery = useQuery({
    queryKey: ["portfolio-projects", user?.tenantId, user?.centralId],
    queryFn: () => listProjectsForPortfolio(user!),
    enabled: !!user,
    staleTime: 30_000,
  });

  const projects = projectsQuery.data ?? [];
  const projectIds = useMemo(() => projects.map((p) => p.id), [projects]);

  const watchlistQuery = useQuery({
    queryKey: ["portfolio-watchlist", user?.centralId],
    queryFn: () => listWatchlist("project"),
    enabled: !!user && persona === "investor",
    staleTime: 15_000,
  });

  const watchlistProjectIds = useMemo(
    () => new Set((watchlistQuery.data ?? []).map((w) => w.object_id)),
    [watchlistQuery.data],
  );

  const progressQuery = useQuery({
    queryKey: ["portfolio-objective-progress", projectIds.join(","), user?.tenantId],
    queryFn: () => fetchProjectObjectiveProgress(user!, projectIds),
    enabled: !!user && projectIds.length > 0,
    staleTime: 30_000,
  });

  const progressMap = progressQuery.data ?? {};

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );

  const allTags = useMemo(
    () => [...new Set(projects.flatMap((p) => p.tags ?? []))].sort(),
    [projects],
  );

  const allStatuses = useMemo(
    () => [...new Set(projects.map((p) => p.status).filter(Boolean) as string[])].sort(),
    [projects],
  );

  const tabCounts = useMemo(() => {
    if (!user) return { all: 0, owned: 0, collaborations: 0, watchlist: 0, viewer: 0 };
    const owned = projects.filter((p) => p.owner_central_id === user.centralId).length;
    const collaborations = projects.filter(
      (p) =>
        p.owner_central_id !== user.centralId &&
        p.collab_role !== null &&
        p.collab_role !== "viewer",
    ).length;
    const watchlist = projects.filter((p) => watchlistProjectIds.has(p.id)).length;
    const viewer = projects.filter((p) => p.collab_role === "viewer").length;
    return { all: projects.length, owned, collaborations, watchlist, viewer };
  }, [projects, user, watchlistProjectIds]);

  const filteredProjects = useMemo(() => {
    if (!user) return [];
    let result: ProjectPortfolioItem[] = [...projects];

    // Tab filter
    if (activeTab === "owned") {
      result = result.filter((p) => p.owner_central_id === user.centralId);
    } else if (activeTab === "collaborations") {
      result = result.filter(
        (p) =>
          p.owner_central_id !== user.centralId &&
          p.collab_role !== null &&
          p.collab_role !== "viewer",
      );
    } else if (activeTab === "watchlist") {
      result = result.filter((p) => watchlistProjectIds.has(p.id));
    } else if (activeTab === "viewer") {
      result = result.filter((p) => p.collab_role === "viewer");
    }

    // Search filter
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description ?? "").toLowerCase().includes(q) ||
          (p.tags ?? []).some((t) => t.toLowerCase().includes(q)),
      );
    }

    // Status filter
    if (filterStatus.length > 0) {
      result = result.filter((p) => p.status && filterStatus.includes(p.status));
    }

    // Tag filter
    if (filterTags.length > 0) {
      result = result.filter((p) =>
        filterTags.every((ft) => (p.tags ?? []).includes(ft)),
      );
    }

    // Sort
    result.sort((a, b) => {
      if (sort === "name_asc") return a.name.localeCompare(b.name);
      if (sort === "name_desc") return b.name.localeCompare(a.name);
      const aTotal = progressMap[a.id]?.total ?? 0;
      const bTotal = progressMap[b.id]?.total ?? 0;
      if (sort === "obj_most") return bTotal - aTotal;
      if (sort === "obj_least") return aTotal - bTotal;
      return 0;
    });

    return result;
  }, [projects, user, activeTab, search, filterStatus, filterTags, sort, progressMap, watchlistProjectIds]);

  const activeFiltersCount = filterStatus.length + filterTags.length;

  const clearFilters = useCallback(() => {
    setFilterStatus([]);
    setFilterTags([]);
  }, []);

  const isLoading = projectsQuery.isLoading;

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
      {/* Page header */}
      <div
        style={{
          padding: "28px 32px 0",
          borderBottom: "1px solid var(--skin-line)",
          background: "var(--skin-surface)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 20,
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 28,
                fontWeight: 700,
                color: "var(--skin-ink)",
                fontFamily: "var(--skin-font-head)",
                lineHeight: 1.15,
              }}
            >
              Portfolio
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--skin-ink-soft)" }}>
              {isLoading ? "Loading…" : `${projects.length} project${projects.length !== 1 ? "s" : ""}`}
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Audience switch */}
            <div
              style={{
                display: "flex",
                gap: 2,
                padding: "3px",
                borderRadius: "var(--xr-lg, 10px)",
                background: "var(--skin-surface2)",
                border: "1px solid var(--skin-line)",
              }}
            >
              {(["overview", "marketplace", "investor"] as const).map((aud) => (
                <button
                  key={aud}
                  type="button"
                  onClick={() => setAudience(aud)}
                  disabled={aud !== "overview"}
                  style={{
                    all: "unset",
                    cursor: aud === "overview" ? "pointer" : "default",
                    padding: "4px 12px",
                    borderRadius: "var(--xr, 6px)",
                    fontSize: 12,
                    fontWeight: 500,
                    color:
                      audience === aud
                        ? "var(--skin-ink)"
                        : aud !== "overview"
                          ? "var(--skin-ink-faint)"
                          : "var(--skin-ink-soft)",
                    background: audience === aud ? "var(--skin-surface)" : "transparent",
                    boxShadow: audience === aud ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
                    transition: "background 0.1s, color 0.1s",
                  }}
                >
                  {aud.charAt(0).toUpperCase() + aud.slice(1)}
                  {aud !== "overview" && (
                    <span
                      style={{
                        marginLeft: 4,
                        fontSize: 9,
                        fontWeight: 600,
                        color: "var(--skin-ink-faint)",
                        letterSpacing: "0.05em",
                      }}
                    >
                      SOON
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Project tabs — visible set is persona-scoped */}
        <div style={{ display: "flex", gap: 0, overflowX: "auto" }}>
          {TABS_BY_PERSONA[persona].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              style={{
                all: "unset",
                cursor: "pointer",
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: activeTab === tab ? 600 : 400,
                color: activeTab === tab ? "var(--skin-ink)" : "var(--skin-ink-soft)",
                borderBottom: activeTab === tab ? "2px solid var(--skin-accent)" : "2px solid transparent",
                transition: "color 0.1s, border-color 0.1s",
                whiteSpace: "nowrap",
              }}
            >
              {PROJECT_TAB_LABELS[tab]}
              <span
                style={{
                  marginLeft: 6,
                  fontSize: 11,
                  fontWeight: 500,
                  padding: "1px 6px",
                  borderRadius: "var(--xr-pill, 999px)",
                  background: activeTab === tab ? "var(--skin-accent-soft)" : "var(--skin-surface2)",
                  color: activeTab === tab ? "var(--skin-ink)" : "var(--skin-ink-faint)",
                }}
              >
                {tabCounts[tab]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div
        style={{
          padding: "12px 32px",
          display: "flex",
          gap: 8,
          alignItems: "center",
          borderBottom: "1px solid var(--skin-line-soft)",
          background: "var(--skin-surface)",
          flexWrap: "wrap",
        }}
      >
        {/* Search */}
        <div style={{ position: "relative", flex: "1 1 240px", maxWidth: 360 }}>
          <Search
            size={14}
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--skin-ink-faint)",
              pointerEvents: "none",
            }}
          />
          <input
            type="text"
            placeholder="Search projects…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="x-input"
            style={{
              width: "100%",
              paddingLeft: 32,
              paddingRight: search ? 32 : 10,
              height: 32,
              fontSize: 13,
            }}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              style={{
                all: "unset",
                cursor: "pointer",
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--skin-ink-faint)",
                display: "flex",
                alignItems: "center",
              }}
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Sort dropdown */}
        <div ref={sortRef} style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => setSortOpen((v) => !v)}
            style={{
              all: "unset",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "0 10px",
              height: 32,
              fontSize: 13,
              fontWeight: 400,
              borderRadius: "var(--xr, 6px)",
              border: "1px solid var(--skin-line)",
              color: "var(--skin-ink-soft)",
              background: "var(--skin-surface)",
              whiteSpace: "nowrap",
            }}
          >
            {SORT_LABELS[sort]}
            <ChevronDown size={13} style={{ color: "var(--skin-ink-faint)" }} />
          </button>
          {sortOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                right: 0,
                zIndex: 50,
                background: "var(--skin-surface)",
                border: "1px solid var(--skin-line)",
                borderRadius: "var(--xr-lg, 10px)",
                boxShadow: "var(--shadow-dropdown)",
                minWidth: 180,
                overflow: "hidden",
              }}
            >
              {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => { setSort(key); setSortOpen(false); }}
                  style={{
                    all: "unset",
                    cursor: "pointer",
                    display: "block",
                    width: "100%",
                    padding: "8px 14px",
                    fontSize: 13,
                    color: sort === key ? "var(--skin-accent)" : "var(--skin-ink)",
                    fontWeight: sort === key ? 600 : 400,
                    background: sort === key ? "var(--skin-accent-soft)" : "transparent",
                    boxSizing: "border-box",
                  }}
                >
                  {SORT_LABELS[key]}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Filter toggle */}
        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          style={{
            all: "unset",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "0 10px",
            height: 32,
            fontSize: 13,
            borderRadius: "var(--xr, 6px)",
            border: `1px solid ${filtersOpen || activeFiltersCount > 0 ? "var(--skin-accent)" : "var(--skin-line)"}`,
            color: filtersOpen || activeFiltersCount > 0 ? "var(--skin-accent)" : "var(--skin-ink-soft)",
            background: filtersOpen || activeFiltersCount > 0 ? "var(--skin-accent-soft)" : "var(--skin-surface)",
          }}
        >
          <SlidersHorizontal size={13} />
          Filters
          {activeFiltersCount > 0 && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                minWidth: 18,
                height: 18,
                borderRadius: "50%",
                background: "var(--skin-accent)",
                color: "var(--skin-on-accent)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {activeFiltersCount}
            </span>
          )}
        </button>

        {/* Active filter chips + clear */}
        {activeFiltersCount > 0 && (
          <>
            {filterStatus.map((s) => (
              <span
                key={s}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "2px 8px 2px 10px",
                  borderRadius: "var(--xr-pill, 999px)",
                  background: "var(--skin-surface2)",
                  border: "1px solid var(--skin-line)",
                  fontSize: 12,
                  color: "var(--skin-ink-soft)",
                }}
              >
                {s}
                <button
                  type="button"
                  onClick={() => setFilterStatus((v) => v.filter((x) => x !== s))}
                  style={{ all: "unset", cursor: "pointer", lineHeight: 0 }}
                >
                  <X size={11} />
                </button>
              </span>
            ))}
            {filterTags.map((t) => (
              <span
                key={t}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "2px 8px 2px 10px",
                  borderRadius: "var(--xr-pill, 999px)",
                  background: "var(--skin-accent-soft)",
                  border: "1px solid var(--skin-line)",
                  fontSize: 12,
                  color: "var(--skin-ink-soft)",
                }}
              >
                #{t}
                <button
                  type="button"
                  onClick={() => setFilterTags((v) => v.filter((x) => x !== t))}
                  style={{ all: "unset", cursor: "pointer", lineHeight: 0 }}
                >
                  <X size={11} />
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={clearFilters}
              style={{
                all: "unset",
                cursor: "pointer",
                fontSize: 12,
                color: "var(--skin-ink-faint)",
                textDecoration: "underline",
              }}
            >
              Clear all
            </button>
          </>
        )}
      </div>

      {/* Filter panel */}
      {filtersOpen && (
        <div
          style={{
            padding: "14px 32px",
            borderBottom: "1px solid var(--skin-line-soft)",
            background: "var(--skin-surface2)",
            display: "flex",
            flexWrap: "wrap",
            gap: 20,
          }}
        >
          {allStatuses.length > 0 && (
            <div>
              <p
                style={{
                  margin: "0 0 8px",
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "var(--skin-ink-faint)",
                }}
              >
                Status
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {allStatuses.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() =>
                      setFilterStatus((v) =>
                        v.includes(s) ? v.filter((x) => x !== s) : [...v, s],
                      )
                    }
                    style={{
                      all: "unset",
                      cursor: "pointer",
                      padding: "3px 10px",
                      borderRadius: "var(--xr-pill, 999px)",
                      border: `1px solid ${filterStatus.includes(s) ? "var(--skin-accent)" : "var(--skin-line)"}`,
                      fontSize: 12,
                      fontWeight: filterStatus.includes(s) ? 600 : 400,
                      color: filterStatus.includes(s) ? "var(--skin-accent)" : "var(--skin-ink-soft)",
                      background: filterStatus.includes(s) ? "var(--skin-accent-soft)" : "var(--skin-surface)",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {allTags.length > 0 && (
            <div>
              <p
                style={{
                  margin: "0 0 8px",
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "var(--skin-ink-faint)",
                }}
              >
                Tags
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() =>
                      setFilterTags((v) =>
                        v.includes(tag) ? v.filter((x) => x !== tag) : [...v, tag],
                      )
                    }
                    style={{
                      all: "unset",
                      cursor: "pointer",
                      padding: "3px 10px",
                      borderRadius: "var(--xr-pill, 999px)",
                      border: `1px solid ${filterTags.includes(tag) ? "var(--skin-accent)" : "var(--skin-line)"}`,
                      fontSize: 12,
                      fontWeight: filterTags.includes(tag) ? 600 : 400,
                      color: filterTags.includes(tag) ? "var(--skin-accent)" : "var(--skin-ink-soft)",
                      background: filterTags.includes(tag) ? "var(--skin-accent-soft)" : "var(--skin-surface)",
                    }}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {allStatuses.length === 0 && allTags.length === 0 && (
            <p style={{ fontSize: 13, color: "var(--skin-ink-faint)", margin: 0 }}>
              No filters available for the current projects.
            </p>
          )}
        </div>
      )}

      {/* Results area */}
      <div style={{ flex: 1, padding: "20px 32px 32px", background: "var(--skin-bg)" }}>
        {isLoading ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: 16,
            }}
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                style={{
                  height: 200,
                  borderRadius: "var(--xr-lg, 10px)",
                  background: "var(--skin-surface)",
                  border: "2px solid var(--skin-line)",
                  opacity: 0.5,
                  animation: "pulse 1.5s ease-in-out infinite",
                }}
              />
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
              color: "var(--skin-ink-faint)",
            }}
          >
            <p style={{ fontSize: 15, fontWeight: 500, color: "var(--skin-ink-soft)", margin: "0 0 6px" }}>
              No projects found
            </p>
            <p style={{ fontSize: 13, margin: 0 }}>
              {search || activeFiltersCount > 0
                ? "Try adjusting your search or filters."
                : "Projects you own or collaborate on will appear here."}
            </p>
          </div>
        ) : (
          <>
            <p
              style={{
                margin: "0 0 14px",
                fontSize: 12,
                color: "var(--skin-ink-faint)",
                fontWeight: 500,
              }}
            >
              {filteredProjects.length} result{filteredProjects.length !== 1 ? "s" : ""}
              {filteredProjects.length !== projects.length && ` of ${projects.length}`}
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                gap: 16,
              }}
            >
              {filteredProjects.map((project) => (
                <PortfolioProjectCard
                  key={project.id}
                  project={project}
                  progress={progressMap[project.id]}
                  user={user!}
                  onClick={() =>
                    setSelectedProjectId((prev) => (prev === project.id ? null : project.id))
                  }
                  selected={selectedProjectId === project.id}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Stub panel */}
      <ProjectStubPanel
        project={selectedProject}
        progress={selectedProject ? progressMap[selectedProject.id] : undefined}
        user={user!}
        onClose={() => setSelectedProjectId(null)}
        showWatchlistAction={persona === "investor" && activeTab === "all"}
        showRequestDetailsAction={persona === "investor" && activeTab === "watchlist"}
      />
    </div>
  );
}
