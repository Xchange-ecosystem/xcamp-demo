import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { PageHeroShell } from "@/components/PageHeroShell";
import { useAuth } from "@/contexts/auth";
import { useActiveProject } from "@/contexts/active-project";
import { supabase } from "@/lib/supabase";
import { useDebounce } from "@/hooks/useDebounce";
import { fetchProjectMetrics } from "@/lib/xcamp-api";
import { useBrand } from "@/lib/brand";
import { toast } from "sonner";

export const Route = createFileRoute("/project-details")({
  head: () => ({
    meta: [{ title: "Project Details — Xcamp" }],
  }),
  component: ProjectDetailsPage,
});

interface ProjectData {
  id: string;
  title: string;
  description: string | null;
  feature_image: string | null;
}

const LABEL_STYLE: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--skin-ink-soft)",
  marginBottom: 6,
};

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 6,
  border: "1px solid var(--skin-line)",
  background: "transparent",
  color: "var(--skin-ink)",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

function ProjectDetailsPage() {
  const { user } = useAuth();
  const brand = useBrand();
  const { activeProjectId } = useActiveProject();
  const queryClient = useQueryClient();

  const [fetchLoading, setFetchLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [featureImage, setFeatureImage] = useState<string | null>(null);
  const [savedContent, setSavedContent] = useState<{ title: string; description: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [metrics, setMetrics] = useState<{ objectives: number; tasks: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMounted = useRef(false);

  const debouncedTitle = useDebounce(title, 1500);
  const debouncedDescription = useDebounce(description, 1500);

  // Fetch project data when active project changes
  useEffect(() => {
    if (!activeProjectId) {
      setFetchLoading(false);
      return;
    }
    setFetchLoading(true);
    setFetchError(null);
    isMounted.current = false;

    supabase
      .from("projects")
      .select("id, title, description, feature_image")
      .eq("id", activeProjectId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setFetchError("Could not load project.");
          setFetchLoading(false);
          return;
        }
        const p = data as unknown as ProjectData;
        setTitle(p.title ?? "");
        setDescription(p.description ?? "");
        setFeatureImage(p.feature_image ?? null);
        setSavedContent({ title: p.title ?? "", description: p.description ?? "" });
        setFetchLoading(false);
      });
  }, [activeProjectId]);

  // Fetch metrics whenever active project changes
  useEffect(() => {
    if (!user || !activeProjectId) return;
    fetchProjectMetrics(user, [activeProjectId])
      .then((m) => setMetrics(m[activeProjectId] ?? null))
      .catch(() => {});
  }, [user, activeProjectId]);

  // Autosave title + description on debounce (pattern mirrors project.$projectId.tsx)
  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }
    if (!savedContent || fetchLoading || !activeProjectId) return;
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
          .eq("id", activeProjectId);
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
    void doSave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedTitle, debouncedDescription]);

  const handleImageUpload = async (file: File) => {
    if (!activeProjectId) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `project-images/${activeProjectId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("App media")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw new Error(uploadError.message);

      const { data: { publicUrl } } = supabase.storage
        .from("App media")
        .getPublicUrl(path);

      const { error } = await (supabase
        .from("projects")
        .update({ feature_image: publicUrl, updated_at: new Date().toISOString() })
        .eq("id", activeProjectId) as unknown as Promise<{ error: { message: string } | null }>);
      if (error) throw new Error(error.message);

      setFeatureImage(publicUrl);
      // Invalidate so EcosystemHome tiles and ProjectHome hero reflect the new image
      await queryClient.invalidateQueries({ queryKey: ["projects-full"] });
      toast.success("Feature image updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  // Empty state — no project selected
  if (!activeProjectId) {
    return (
      <AppShell>
        <PageHeroShell
          logo={<img src={brand.logoUrl} alt={brand.name} className="h-6 sm:h-8 w-auto" />}
          title="Project Details"
          subtitle="Select a project from the sidebar to view and edit its details."
          showImageReload={false}
        >
          <div
            className="px-4 py-10 text-center"
            style={{ color: "var(--skin-ink-soft)", fontSize: 14 }}
          >
            No project selected.
          </div>
        </PageHeroShell>
      </AppShell>
    );
  }

  if (fetchLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--skin-ink-faint)" }} />
        </div>
      </AppShell>
    );
  }

  if (fetchError) {
    return (
      <AppShell>
        <div className="px-4 py-10 text-center" style={{ color: "var(--skin-ink-soft)", fontSize: 14 }}>
          {fetchError}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeroShell
        logo={<img src={brand.logoUrl} alt={brand.name} className="h-6 sm:h-8 w-auto" />}
        title="Project Details"
        image={featureImage ?? undefined}
        showImageReload={false}
      >
        <div className="px-4 py-6 max-w-2xl space-y-6">

          {/* Metrics row */}
          {metrics && (
            <div className="flex gap-3">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 12px",
                  borderRadius: 20,
                  border: "1px solid var(--skin-line)",
                  fontSize: 13,
                  color: "var(--skin-ink)",
                }}
              >
                <span style={{ fontWeight: 600 }}>{metrics.objectives}</span>
                <span style={{ color: "var(--skin-ink-soft)", fontSize: 11 }}>objectives</span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 12px",
                  borderRadius: 20,
                  border: "1px solid var(--skin-line)",
                  fontSize: 13,
                  color: "var(--skin-ink)",
                }}
              >
                <span style={{ fontWeight: 600 }}>{metrics.tasks}</span>
                <span style={{ color: "var(--skin-ink-soft)", fontSize: 11 }}>tasks</span>
              </div>
            </div>
          )}

          {/* Feature image */}
          <div>
            <label style={LABEL_STYLE}>Feature Image</label>
            <div
              style={{
                position: "relative",
                borderRadius: 8,
                overflow: "hidden",
                border: "1px solid var(--skin-line)",
                height: 148,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: featureImage ? "transparent" : "var(--skin-surface)",
              }}
            >
              {featureImage && (
                <img
                  src={featureImage}
                  alt="Project feature"
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                style={{
                  position: "relative",
                  zIndex: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 14px",
                  borderRadius: 6,
                  border: featureImage ? "1px solid rgba(255,255,255,0.3)" : "1px solid var(--skin-accent, #4de0c1)",
                  background: featureImage ? "rgba(0,0,0,0.45)" : "var(--skin-accent, #4de0c1)",
                  color: featureImage ? "#fff" : "var(--skin-bg, #0a0a0a)",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: uploading ? "not-allowed" : "pointer",
                  backdropFilter: featureImage ? "blur(4px)" : "none",
                  transition: "opacity 0.15s",
                }}
              >
                {uploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ImagePlus className="h-3.5 w-3.5" />
                )}
                {uploading ? "Uploading…" : featureImage ? "Change image" : "Add image"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleImageUpload(file);
                  e.target.value = "";
                }}
              />
            </div>
          </div>

          {/* Title */}
          <div>
            <label style={LABEL_STYLE}>Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={INPUT_STYLE}
              placeholder="Project title"
            />
          </div>

          {/* Description */}
          <div>
            <label style={LABEL_STYLE}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              style={{ ...INPUT_STYLE, resize: "vertical" }}
              placeholder="Describe this project…"
            />
          </div>

          {/* Save status */}
          <div style={{ fontSize: 12, color: "var(--skin-ink-faint)", minHeight: 16 }}>
            {saving && "Saving…"}
            {saved && !saving && "Saved"}
            {saveError && (
              <span style={{ color: "var(--skin-error, #ef4444)" }}>{saveError}</span>
            )}
          </div>

        </div>
      </PageHeroShell>
    </AppShell>
  );
}
