import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeroShell } from "@/components/PageHeroShell";
import { Journal } from "@/components/Journal";
import { useBrand } from "@/lib/brand";

export const Route = createFileRoute("/notes")({
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
  return (
    <AppShell>
      <PageHeroShell
        logo={<img src={brand.logoUrl} alt={brand.name} className="h-6 sm:h-8 w-auto" />}
        title="Notes"
        subtitle="Capture and manage your notes in the Xcamp ecosystem."
      >
        <Journal />
      </PageHeroShell>
    </AppShell>
  );
}
