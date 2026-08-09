import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeroShell } from "@/components/PageHeroShell";
import { NotesBrowser } from "@/components/NotesBrowser";
import { useBrand } from "@/lib/brand";

export const Route = createFileRoute("/notes")({
  validateSearch: (search: Record<string, string>) => ({
    new: search.new === "1" ? ("1" as const) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Notes — Xcamp Journal" },
      { name: "description", content: "Capture and manage your notes natively in the Xcamp ecosystem." },
    ],
  }),
  component: NotesPage,
});

function NotesPage() {
  const brand = useBrand();
  const { new: isNew } = Route.useSearch();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<{ body: string; key: number } | null>(null);
  const prevIsNew = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (isNew === "1" && prevIsNew.current !== "1") {
      setDraft({ body: "", key: Date.now() });
      void navigate({ to: "/notes", replace: true });
    }
    prevIsNew.current = isNew;
  }, [isNew, navigate]);

  return (
    <AppShell>
      <PageHeroShell
        logo={<img src={brand.logoUrl} alt={brand.name} className="h-6 sm:h-8 w-auto" />}
        title="Notes"
        subtitle="Capture and manage your notes in the Xcamp ecosystem."
      >
        <NotesBrowser draft={draft} />
      </PageHeroShell>
    </AppShell>
  );
}
