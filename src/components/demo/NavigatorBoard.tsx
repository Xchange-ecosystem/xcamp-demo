// Shared column-board shell, extracted in the B4 session from
// src/routes/demo.founder.navigator.tsx, where this layout was inlined and
// therefore not reusable. Two consumers now: the Navigator screens (columns =
// objective lifecycle status) and Club Deal Finder (columns = deal stages).
//
// The shell owns column chrome only — the grid, headers, counts, hints, empty
// state, and the "grave" tone. Cards are supplied by the caller as children,
// because an objective card and a project card have nothing in common beyond
// sitting in a column. Extracting further would have meant one component
// pretending two unrelated card shapes were the same thing.
//
// Tone: "grave" is the Objectives design philosophy's gravity register — the
// sober treatment for binding, contractual states, where the skin deliberately
// stops being cheerful. It reads through the --gravity-* tokens (see
// src/styles.css), which B4 gave dark-mode values; before that --gravity-bg
// was light-only and unused.
import type { ReactNode } from "react";

export type BoardColumnTone = "default" | "grave";

export interface BoardColumn {
  key: string;
  label: string;
  /** Shown next to the label. Passed explicitly rather than counting children,
   *  since children are opaque nodes here. */
  count: number;
  /** One short line under the header saying what the column means. */
  hint?: string;
  tone?: BoardColumnTone;
  /** Copy for the column when count is 0. */
  empty?: string;
  children: ReactNode;
}

function columnHeaderStyle(tone: BoardColumnTone) {
  return tone === "grave" ? { color: "var(--gravity-ink)" } : { color: "var(--skin-ink-soft)" };
}

export function NavigatorBoard({ columns }: { columns: BoardColumn[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {columns.map((col) => {
        const tone = col.tone ?? "default";
        return (
          <section
            key={col.key}
            style={
              tone === "grave"
                ? {
                    background: "var(--gravity-bg)",
                    border: "1px solid var(--gravity-line)",
                    borderRadius: "var(--xr-lg, 10px)",
                    padding: 10,
                    // No transition, no hover lift, no accent: a binding stage
                    // should not feel celebratory.
                  }
                : { padding: 10, border: "1px solid transparent" }
            }
          >
            <header className="mb-2">
              <h3 className="text-xs font-semibold" style={columnHeaderStyle(tone)}>
                {col.label} <span className="font-normal">({col.count})</span>
              </h3>
              {col.hint && (
                <p
                  className="mt-0.5 text-[11px] leading-snug"
                  style={{
                    color: tone === "grave" ? "var(--gravity-ink)" : "var(--skin-ink-faint)",
                    opacity: tone === "grave" ? 0.75 : 1,
                  }}
                >
                  {col.hint}
                </p>
              )}
            </header>

            <div className="flex flex-col gap-2">
              {col.count === 0 ? (
                <p className="text-xs" style={{ color: "var(--skin-ink-faint)" }}>
                  {col.empty ?? "Nothing here."}
                </p>
              ) : (
                col.children
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
