import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Loader2, X, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeroShell } from "@/components/PageHeroShell";
import { AppLogo } from "@/components/AppLogo";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth";
import { useDebounce } from "@/hooks/useDebounce";
import { useObjectives } from "@/lib/navigator-api";
import type { ObjectiveRow } from "@/lib/navigator-api";

export const Route = createFileRoute("/project/$projectId")({
  head: () => ({
    meta: [{ title: "Project — Xcamp" }],
  }),
  component: ProjectPage,
});

interface ProjectData {
  id: string;
  title: string;
  description: string | null;
  tags: string[] | null;
}

// hero_image_url is not in the projects table schema (confirmed via information_schema query).
// PageHeroShell's seed-based useHeroImage provides the hero. A migration is needed
// before per-project custom images can persist.

function ProjectPage() {
  const { projectId } = Route.useParams();
  const { user } = useAuth();

  const [fetchLoading, setFetchLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [showAllTags, setShowAllTags] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);

  const [savedContent, setSavedContent] = useState<{
    title: string;
    description: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const debouncedTitle = useDebounce(title, 1500);
  const debouncedDescription = useDebounce(description, 1500);

  // Fetch project
  useEffect(() => {
    let cancelled = false;
    setFetchLoading(true);
    setFetchError(null);

    supabase
      .from("projects")
      .select("id, title, description, tags")
      .eq("id", projectId)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          setFetchError("Could not load project.");
          setFetchLoading(false);
          return;
        }
        const p = data as unknown as ProjectData;
        setTitle(p.title ?? "");
        setDescription(p.description ?? "");
        setTags(Array.isArray(p.tags) ? (p.tags as string[]) : []);
        setSavedContent({ title: p.title ?? "", description: p.description ?? "" });
        setFetchLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  // Autosave title + description on 1500ms debounce
  const isMounted = useRef(false);
  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }
    if (!savedContent || fetchLoading) return;
    if (
      debouncedTitle === savedContent.title &&
      debouncedDescription === savedContent.description
    )
      return;

    const doSave = async () => {
      setSaving(true);
      setSaveError(null);
      try {
        const { error } = await supabase
          .from("projects")
          .update({
            title: debouncedTitle,
            description: debouncedDescription || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", projectId);
        if (error) throw error;
        setSavedContent({ title: debouncedTitle, description: debouncedDescription });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch {
        setSaveError("Autosave failed.");
      } finally {
        setSaving(false);
      }
    };
    doSave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedTitle, debouncedDescription]);

  const saveTags = async (nextTags: string[]) => {
    await supabase
      .from("projects")
      .update({ tags: nextTags, updated_at: new Date().toISOString() })
      .eq("id", projectId);
  };

  const removeTag = (tag: string) => {
    const next = tags.filter((t) => t !== tag);
    setTags(next);
    saveTags(next);
  };

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed || tags.includes(trimmed)) return;
    const next = [...tags, trimmed];
    setTags(next);
    setNewTag("");
    saveTags(next);
  };

  const visibleTags = showAllTags ? tags : tags.slice(0, 3);
  const hiddenCount = tags.length - 3;

  // Objectives (read-only list)
  const { data: objectives, isLoading: objectivesLoading } = useObjectives(
    user,
    projectId,
  );

  if (fetchLoading) {
    return (
      <AppShell>
        <div
          className="flex items-center justify-center min-h-screen"
          style={{ background: "var(--skin-surface)" }}
        >
          <Loader2 size={24} className="animate-spin" style={{ color: "var(--skin-accent)" }} />
        </div>
      </AppShell>
    );
  }

  if (fetchError) {
    return (
      <AppShell>
        <div
          className="flex items-center justify-center min-h-screen"
          style={{ background: "var(--skin-surface)" }}
        >
          <p style={{ color: "var(--skin-ink-soft)" }}>{fetchError}</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeroShell
        seed={projectId}
        showImageReload={true}
        logo={<AppLogo collapsed={true} />}
        eyebrow="Project"
      >
        <div className="px-4 sm:px-5 pb-6 pt-3 space-y-5">
          {/* Editable title */}
          <div className="flex items-center gap-2">
            <input
              className="flex-1 bg-transparent text-xl sm:text-2xl font-semibold outline-none rounded px-1 -mx-1"
              style={{
                color: "var(--skin-ink)",
                border: "1px solid transparent",
              }}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onFocus={(e) => {
                (e.currentTarget as HTMLInputElement).style.border =
                  "1px solid var(--skin-line)";
              }}
              onBlur={(e) => {
                (e.currentTarget as HTMLInputElement).style.border =
                  "1px solid transparent";
              }}
              aria-label="Project title"
              placeholder="Project title"
            />
            <span
              className="text-xs shrink-0"
              style={{
                color: saving ? "var(--skin-ink-soft)" : "var(--skin-accent)",
                opacity: saving || saved ? 1 : 0,
                transition: "opacity 0.2s",
              }}
            >
              {saving ? "Saving…" : "Saved"}
            </span>
          </div>

          {saveError && (
            <p style={{ color: "var(--skin-danger, #d4524e)", fontSize: 13 }}>
              {saveError}
            </p>
          )}

          {/* Tags — projects.tags column (ARRAY) confirmed in schema */}
          <div className="flex flex-wrap items-center gap-2">
            {visibleTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium"
                style={{
                  background: "var(--skin-surface)",
                  border: "1px solid var(--skin-line)",
                  color: "var(--skin-ink)",
                }}
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="ml-0.5 opacity-60 hover:opacity-100 cursor-pointer"
                  aria-label={`Remove tag ${tag}`}
                >
                  <X size={11} />
                </button>
              </span>
            ))}
            {!showAllTags && hiddenCount > 0 && (
              <button
                type="button"
                onClick={() => setShowAllTags(true)}
                className="text-xs"
                style={{ color: "var(--skin-ink-soft)" }}
              >
                +{hiddenCount} more
              </button>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addTag(newTag);
              }}
              className="inline-flex"
            >
              <input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="+ Add tag"
                className="rounded-full px-3 py-1 text-xs outline-none"
                style={{
                  background: "var(--skin-surface)",
                  border: "1px solid var(--skin-line)",
                  color: "var(--skin-ink)",
                  width: newTag ? "auto" : 72,
                }}
              />
            </form>
            {/* Suggest tags — STUB: no AI tagging endpoint exists yet */}
            <button
              type="button"
              disabled
              title="AI tag suggestions coming soon"
              className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs opacity-40 cursor-not-allowed"
              style={{
                border: "1px solid var(--skin-line)",
                color: "var(--skin-ink-soft)",
              }}
            >
              <Sparkles size={11} />
              Suggest tags
              {/* TODO: call an AI suggest-tags endpoint once available */}
            </button>
          </div>

          {/* Description — projects.description column (text) confirmed in schema */}
          <div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={showFullDescription ? 8 : 3}
              placeholder="Add a description…"
              className="w-full rounded-xl p-3 text-sm outline-none resize-none leading-relaxed"
              style={{
                background: "var(--skin-surface)",
                border: "1px solid var(--skin-line)",
                color: "var(--skin-ink)",
              }}
              onFocus={(e) => {
                setShowFullDescription(true);
                (e.currentTarget as HTMLTextAreaElement).style.border =
                  "1px solid var(--skin-accent)";
              }}
              onBlur={(e) => {
                (e.currentTarget as HTMLTextAreaElement).style.border =
                  "1px solid var(--skin-line)";
              }}
            />
            {description.length > 150 && (
              <button
                type="button"
                onClick={() => setShowFullDescription((v) => !v)}
                className="text-xs mt-1"
                style={{ color: "var(--skin-ink-soft)" }}
              >
                {showFullDescription ? "Show less" : "Show more"}
              </button>
            )}
          </div>

          {/* Objectives — read-only list */}
          <ProjectObjectivesSection
            objectives={objectives ?? []}
            loading={objectivesLoading}
          />
        </div>
      </PageHeroShell>
    </AppShell>
  );
}

function ProjectObjectivesSection({
  objectives,
  loading,
}: {
  objectives: ObjectiveRow[];
  loading: boolean;
}) {
  return (
    <div className="mt-2">
      <h2
        className="text-base font-semibold mb-3"
        style={{ color: "var(--skin-ink)" }}
      >
        Objectives
      </h2>
      {loading ? (
        <div
          className="flex items-center gap-2 text-sm"
          style={{ color: "var(--skin-ink-soft)" }}
        >
          <Loader2 size={14} className="animate-spin" /> Loading…
        </div>
      ) : objectives.length > 0 ? (
        <div className="space-y-2">
          {objectives.map((o) => (
            <div
              key={o.id}
              className="rounded-xl px-4 py-3 flex items-center justify-between gap-3"
              style={{
                background: "var(--skin-surface)",
                border: "1px solid var(--skin-line)",
              }}
            >
              <span
                className="text-sm font-medium"
                style={{ color: "var(--skin-ink)" }}
              >
                {o.title}
              </span>
              {o.status && (
                <span
                  className="text-xs rounded-full px-2 py-0.5 shrink-0"
                  style={{
                    background: "var(--skin-line)",
                    color: "var(--skin-ink-soft)",
                  }}
                >
                  {o.status}
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm" style={{ color: "var(--skin-ink-soft)" }}>
          No objectives yet.
        </p>
      )}
    </div>
  );
}
