import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeroShell } from "@/components/PageHeroShell";
import { JournalFlow } from "@/components/JournalFlow";
import { useBrand } from "@/lib/brand";

export const Route = createFileRoute("/journal")({
  validateSearch: (search: Record<string, string>) => ({
    new: search.new === "1" ? ("1" as const) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Journal — Xcamp Journal" },
      { name: "description", content: "Turn journal entries and voice notes into project-linked notes in the Xcamp ecosystem." },
    ],
  }),
  component: JournalPage,
});

function JournalPage() {
  const brand = useBrand();
  const { new: isNew } = Route.useSearch();
  const navigate = useNavigate();
  const [entryKey, setEntryKey] = useState(0);
  const prevIsNew = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (isNew === "1" && prevIsNew.current !== "1") {
      setEntryKey((k) => k + 1);
      void navigate({ to: "/journal", replace: true });
    }
    prevIsNew.current = isNew;
  }, [isNew, navigate]);

  return (
    <AppShell>
      <PageHeroShell
        logo={<img src={brand.logoUrl} alt={brand.name} className="h-6 sm:h-8 w-auto" />}
        title="Journal"
        subtitle="Capture your thoughts — we'll turn them into linked notes."
      >
        <JournalFlow key={entryKey} />
      </PageHeroShell>
    </AppShell>
  );
}
