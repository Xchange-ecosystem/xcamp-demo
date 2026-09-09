import { createFileRoute } from "@tanstack/react-router";
import { MicroAppPlaceholder } from "@/components/demo/MicroAppPlaceholder";

export const Route = createFileRoute("/demo/investor/microapps/hot-stuff")({
  head: () => ({ meta: [{ title: "Hot Stuff — Xcamp" }] }),
  component: HotStuffPage,
});

function HotStuffPage() {
  return (
    <MicroAppPlaceholder
      title="Hot Stuff"
      what="Highlights projects with unusually fast recent progress or quality gains, ranked by momentum rather than size."
      who="Investors scanning for early signal."
      drawsFrom={["Objective completion velocity", "Quality trend"]}
    />
  );
}
