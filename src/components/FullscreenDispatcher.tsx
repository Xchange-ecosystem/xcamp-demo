import { useEffect } from "react";
import { useFullscreenItemStore } from "@/store/fullscreenItemStore";
import { useFullscreenTaskStore } from "@/store/fullscreenTaskStore";
import { TaskFullscreenModal } from "@/components/TaskFullscreenModal";
import { NoteFullscreenModal } from "@/components/NoteFullscreenModal";
import { NoteDetailPlaceholderModal } from "@/components/NoteDetailPlaceholderModal";

// Routes a fullscreen-open request (from ItemSidepanel's FullscreenButton) by
// note_type: "task" gets the real Task fullscreen view, plain notes get a
// simple enlarged-editor view, everything else (idea/question/decision/
// reference) still gets the shared placeholder.
//
// TaskFullscreenModal/useFullscreenTaskStore are only ever driven through
// their existing public open()/close() API here — never edited, never
// reached into. That component is being actively rebuilt in a parallel
// session (PR #103); this dispatcher just decides *whether* to open it.
export function FullscreenDispatcher() {
  const item = useFullscreenItemStore((s) => s.item);
  const closeItem = useFullscreenItemStore((s) => s.close);
  const taskStoreTaskId = useFullscreenTaskStore((s) => s.taskId);

  const isTask = item?.noteType === "task";
  const isNote = item?.noteType === "note";

  // Dispatcher → Task modal: open/close it via its own store when the
  // dispatcher's target item changes.
  useEffect(() => {
    if (isTask && item) {
      useFullscreenTaskStore.getState().open(item.id);
    } else {
      useFullscreenTaskStore.getState().close();
    }
  }, [isTask, item]);

  // Task modal → dispatcher: if the task modal closed itself (Escape,
  // backdrop click, its own Close button), mirror that back so the
  // dispatcher's state doesn't go stale.
  useEffect(() => {
    if (taskStoreTaskId === null && item?.noteType === "task") {
      closeItem();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskStoreTaskId]);

  return (
    <>
      <TaskFullscreenModal />
      <NoteFullscreenModal
        isOpen={item !== null && isNote}
        noteId={isNote ? item!.id : null}
        onClose={closeItem}
      />
      <NoteDetailPlaceholderModal
        isOpen={item !== null && !isTask && !isNote}
        onClose={closeItem}
      />
    </>
  );
}
