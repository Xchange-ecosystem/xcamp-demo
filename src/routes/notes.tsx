import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeroShell } from "@/components/PageHeroShell";
import { NotesBrowser } from "@/components/NotesBrowser";
import { useBrand } from "@/lib/brand";

export const Route = createFileRoute("/notes")({
  // See the matching comment on /journal's validateSearch: standardizing on
  // the number 1 (not the string "1") keeps the URL clean (?new=1, not
  // ?new=%221%22) across every entry point, since validateSearch also runs
  // on the object passed to navigate() before it's serialized.
  validateSearch: (search: Record<string, unknown>) => ({
    new: search.new === 1 || search.new === "1" ? (1 as const) : undefined,
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
  const isComposing = isNew === 1;
  // Bumped on each explicit "new note" request so the draft object's identity
  // changes even when the URL doesn't (e.g. clicking "+ New note" again while
  // already composing) — NotesBrowser's effect keys off that identity.
  const [draftKey, setDraftKey] = useState(0);
  const draft = useMemo(
    () => (isComposing ? { body: "", key: draftKey } : null),
    [isComposing, draftKey],
  );

  return (
    <AppShell>
      <PageHeroShell
        logo={<img src={brand.logoUrl} alt={brand.name} className="h-6 sm:h-8 w-auto" />}
        title="Notes"
        subtitle="Capture and manage your notes in the Xcamp ecosystem."
      >
        <NotesBrowser
          draft={draft}
          isComposing={isComposing}
          onRequestNew={() => {
            setDraftKey((k) => k + 1);
            void navigate({ to: "/notes", search: { new: 1 } });
          }}
          onExitComposer={() => void navigate({ to: "/notes", search: {} })}
        />
      </PageHeroShell>
    </AppShell>
  );
}
