import { useFullscreenItemStore } from "@/store/fullscreenItemStore";
import { DemoTaskFullscreenModal } from "@/components/task-detail/DemoTaskFullscreenModal";
import { isDemoTaskId } from "@/lib/demo-items";

// Demo counterpart to FullscreenDispatcher — reads the same
// useFullscreenItemStore (shared: ItemSidepanel's FullscreenButton opens it
// exactly as it does for the real app) but never mounts the real, auth-gated
// FullscreenDispatcher/TaskFullscreenModal chain. See DemoTaskFullscreenModal
// and DemoTaskPageContent for why. Only demo task items ever reach this
// dispatcher's fullscreen affordance (the sidepanel's FullscreenButton only
// renders for note-kind items), so there's no note/placeholder branch to
// mirror here.
export function DemoFullscreenDispatcher() {
  const item = useFullscreenItemStore((s) => s.item);
  const closeItem = useFullscreenItemStore((s) => s.close);

  const isOpen = item !== null && item.noteType === "task" && isDemoTaskId(item.id);

  return (
    <DemoTaskFullscreenModal
      isOpen={isOpen}
      taskId={isOpen ? item!.id : null}
      onClose={closeItem}
    />
  );
}
