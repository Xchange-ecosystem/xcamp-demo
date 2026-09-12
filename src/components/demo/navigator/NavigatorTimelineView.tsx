// src/components/demo/navigator/NavigatorTimelineView.tsx
//
// The Timeline sub-view — light-canvas swimlane roadmap (one lane per
// objective, task bars on a real time axis, a "today" marker), per the
// prior session's Roadmap spec (renamed "Timeline" per this brief). Phase 0
// found the functional app's Navigator doesn't expose date fields at all,
// so there's nothing to clone — built fresh against demo fixtures. Task
// bars use a derived start date (deriveTaskDateRange in navigatorItems.ts —
// deterministic, computed from the task's real dueDate + priority, not
// invented) since Task has no startDate field. Dependency connectors
// between tasks are intentionally left out, per the brief's default (flag
// if you want them added).
import { useMemo } from "react";
import { getObjectivesByProject, getTasksByObjective } from "@/fixtures/objectives";
import { getProjectById } from "@/fixtures/projects";
import { DEMO_FOUNDER_PROJECT_ID } from "@/fixtures/pitch";
import { useSidepanel } from "@/contexts/sidepanel";
import { deriveTaskDateRange } from "./navigatorItems";
import type { Task } from "@/fixtures/types";

// Matches the fixed "today" anchor already established elsewhere in this
// demo (CompanionInfoPanel, TaskProgressChart) so every screen agrees on
// "now" in the fixture world.
const DEMO_TODAY = "2026-09-04";
const DAY_MS = 86_400_000;
const TRACK_HEIGHT = 26;

const STATUS_COLOR: Record<Task["status"], string> = {
  inactive: "var(--skin-line)",
  active: "var(--skin-accent)",
  completed: "var(--skin-good)",
};

interface Bar {
  task: Task;
  start: Date;
  end: Date;
  track: number;
}

function toDate(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

/** Greedy interval-scheduling row assignment so bars overlapping in time
 *  stack into separate tracks within a lane instead of drawing on top of
 *  each other. */
function assignTracks(bars: Omit<Bar, "track">[]): Bar[] {
  const sorted = [...bars].sort((a, b) => a.start.getTime() - b.start.getTime());
  const trackEndTimes: number[] = [];
  return sorted.map((bar) => {
    let track = trackEndTimes.findIndex((end) => end <= bar.start.getTime());
    if (track === -1) {
      track = trackEndTimes.length;
      trackEndTimes.push(bar.end.getTime());
    } else {
      trackEndTimes[track] = bar.end.getTime();
    }
    return { ...bar, track };
  });
}

export function NavigatorTimelineView() {
  const { open: openSidepanel } = useSidepanel();
  const project = getProjectById(DEMO_FOUNDER_PROJECT_ID);
  const objectives = getObjectivesByProject(DEMO_FOUNDER_PROJECT_ID);

  const lanes = useMemo(
    () =>
      objectives.map((o) => {
        const tasks = getTasksByObjective(o.id).filter(
          (t) => t.projectId === DEMO_FOUNDER_PROJECT_ID,
        );
        const rawBars = tasks
          .map((task) => {
            const range = deriveTaskDateRange(task);
            if (!range) return null;
            return { task, start: toDate(range.start), end: toDate(range.end) };
          })
          .filter((b): b is Omit<Bar, "track"> => b !== null);
        const bars = assignTracks(rawBars);
        const trackCount = bars.reduce((max, b) => Math.max(max, b.track + 1), 0);
        return { objective: o, bars, trackCount };
      }),
    [objectives],
  );

  const { rangeStart, rangeEnd } = useMemo(() => {
    const allDates = lanes.flatMap((l) => l.bars.flatMap((b) => [b.start, b.end]));
    const today = toDate(DEMO_TODAY);
    allDates.push(today);
    if (allDates.length === 0) {
      return { rangeStart: today, rangeEnd: new Date(today.getTime() + 14 * DAY_MS) };
    }
    const min = new Date(Math.min(...allDates.map((d) => d.getTime())) - 3 * DAY_MS);
    const max = new Date(Math.max(...allDates.map((d) => d.getTime())) + 3 * DAY_MS);
    return { rangeStart: min, rangeEnd: max };
  }, [lanes]);

  const totalMs = rangeEnd.getTime() - rangeStart.getTime();
  const pctOf = (d: Date) => ((d.getTime() - rangeStart.getTime()) / totalMs) * 100;
  const todayPct = pctOf(toDate(DEMO_TODAY));

  const tickDates = useMemo(() => {
    const ticks: Date[] = [];
    const totalDays = Math.round(totalMs / DAY_MS);
    const step = Math.max(1, Math.round(totalDays / 8));
    for (let d = 0; d <= totalDays; d += step) {
      ticks.push(new Date(rangeStart.getTime() + d * DAY_MS));
    }
    return ticks;
  }, [rangeStart, totalMs]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex-shrink-0 px-6 pt-6">
        <h1 className="mb-1.5 text-xl font-semibold tracking-tight text-foreground">Navigator</h1>
        <p className="mb-4 text-sm text-muted-foreground">
          {project?.name ?? "This project"}'s tasks, one lane per objective.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-6 pb-6">
        <div style={{ position: "relative", minWidth: 720 }}>
          {/* Date axis */}
          <div
            style={{
              position: "relative",
              height: 24,
              borderBottom: "1px solid var(--skin-line)",
              marginBottom: 8,
            }}
          >
            {tickDates.map((d) => (
              <div
                key={d.toISOString()}
                style={{
                  position: "absolute",
                  left: `${pctOf(d)}%`,
                  top: 0,
                  fontSize: 10.5,
                  color: "var(--skin-ink-faint)",
                  transform: "translateX(-50%)",
                }}
              >
                {d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </div>
            ))}
          </div>

          {/* Lanes + today marker share this relative container */}
          <div style={{ position: "relative" }}>
            <div
              style={{
                position: "absolute",
                left: `${todayPct}%`,
                top: 0,
                bottom: 0,
                width: 2,
                background: "var(--skin-bad, #e11d48)",
                zIndex: 5,
              }}
              title={`Today — ${DEMO_TODAY}`}
            />
            <div
              style={{
                position: "absolute",
                left: `${todayPct}%`,
                top: -4,
                fontSize: 10,
                fontWeight: 700,
                color: "var(--skin-bad, #e11d48)",
                transform: "translateX(-50%)",
                background: "var(--skin-surface)",
                padding: "0 4px",
              }}
            >
              Today
            </div>

            {lanes.map(({ objective, bars, trackCount }) => (
              <div
                key={objective.id}
                style={{
                  display: "flex",
                  alignItems: "stretch",
                  borderBottom: "1px solid var(--skin-line-soft, var(--skin-line))",
                  minHeight: Math.max(44, trackCount * TRACK_HEIGHT + 16),
                }}
              >
                <div
                  style={{
                    width: 220,
                    flexShrink: 0,
                    padding: "10px 12px 10px 0",
                    fontSize: 12.5,
                    fontWeight: 500,
                    color: "var(--skin-ink)",
                    position: "sticky",
                    left: 0,
                    background: "var(--skin-surface)",
                  }}
                >
                  {objective.title}
                </div>
                <div style={{ position: "relative", flex: 1, padding: "8px 0" }}>
                  {bars.length === 0 ? (
                    <span style={{ fontSize: 11, color: "var(--skin-ink-faint)" }}>
                      No tasks yet
                    </span>
                  ) : (
                    bars.map(({ task, start, end, track }) => {
                      const left = pctOf(start);
                      const width = Math.max(pctOf(end) - left, 1.5);
                      return (
                        <button
                          key={task.id}
                          type="button"
                          onClick={() =>
                            openSidepanel({
                              id: task.id,
                              kind: "note",
                              noteType: "task",
                              title: task.title,
                            })
                          }
                          title={`${task.title} — ${task.status}`}
                          style={{
                            position: "absolute",
                            left: `${left}%`,
                            width: `${width}%`,
                            height: 22,
                            top: track * TRACK_HEIGHT,
                            borderRadius: 5,
                            border: "none",
                            background: STATUS_COLOR[task.status],
                            color: "#fff",
                            fontSize: 10.5,
                            fontWeight: 600,
                            padding: "0 6px",
                            overflow: "hidden",
                            whiteSpace: "nowrap",
                            textOverflow: "ellipsis",
                            cursor: "pointer",
                            textAlign: "left",
                          }}
                        >
                          {task.title}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
