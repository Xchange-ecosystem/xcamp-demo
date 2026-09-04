import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeroShell } from "@/components/PageHeroShell";
import { JournalFlow } from "@/components/JournalFlow";
import { useBrand } from "@/lib/brand";

export const Route = createFileRoute("/journal")({
  // The router's default search serialization JSON-round-trips values, and
  // also re-applies validateSearch to the object passed to navigate() before
  // serializing it — so whatever type this returns for "new" is also what
  // gets serialized. A numeral-looking *string* ("1") gets JSON-quoted in the
  // URL (?new=%221%22); the plain *number* 1 does not (?new=1). Standardize
  // on the number everywhere (sidebar files included) so the URL stays clean
  // and every entry point — typed URL, reload, programmatic navigate — agrees.
  validateSearch: (search: Record<string, unknown>) => ({
    new: search.new === 1 || search.new === "1" ? (1 as const) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Journal — Xcamp Journal" },
      {
        name: "description",
        content:
          "Turn journal entries and voice notes into project-linked notes in the Xcamp ecosystem.",
      },
    ],
  }),
  component: JournalPage,
});

function JournalPage() {
  const brand = useBrand();
  const { new: isNew } = Route.useSearch();
  const navigate = useNavigate();
  // Forces a true remount on each explicit "new entry" request (rather than
  // relying solely on JournalFlow's internal reset) so an in-flight analyse
  // call from the entry being abandoned can't land on the fresh composer.
  const [entryKey, setEntryKey] = useState(0);

  return (
    <AppShell>
      <PageHeroShell
        logo={<img src={brand.logoUrl} alt={brand.name} className="h-6 sm:h-8 w-auto" />}
        title="Journal"
        subtitle="Capture your thoughts — we'll turn them into linked notes."
      >
        <JournalFlow
          key={entryKey}
          isComposing={isNew === 1}
          onRequestNew={() => {
            setEntryKey((k) => k + 1);
            void navigate({ to: "/journal", search: { new: 1 } });
          }}
          onExitComposer={() => void navigate({ to: "/journal", search: {} })}
        />
      </PageHeroShell>
    </AppShell>
  );
}
