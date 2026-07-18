import { createFileRoute } from "@tanstack/react-router";
import { Journal } from "@/components/Journal";

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
  return <Journal />;
}
