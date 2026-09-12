// src/components/demo/navigator/NavigatorListView.tsx
//
// New build (Phase 0 found no List/table view anywhere to clone) — a plain
// sortable/filterable table over the same Objective+Task item set Board/
// Network/Timeline all draw from (navigatorItems.ts). No new fixture data.
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSidepanel } from "@/contexts/sidepanel";
import { getProjectById } from "@/fixtures/projects";
import { DEMO_FOUNDER_PROJECT_ID } from "@/fixtures/pitch";
import { getNavigatorItems, type NavigatorItem, type NavigatorItemType } from "./navigatorItems";

type SortKey = "title" | "type" | "status" | "ownerName" | "dueDate";
type SortDir = "asc" | "desc";

const TYPE_FILTERS: { value: NavigatorItemType | "all"; label: string }[] = [
  { value: "all", label: "All types" },
  { value: "objective", label: "Objectives" },
  { value: "task", label: "Tasks" },
];

function compare(a: NavigatorItem, b: NavigatorItem, key: SortKey): number {
  const av = a[key] ?? "";
  const bv = b[key] ?? "";
  if (key === "dueDate") {
    // Nulls (objectives have no due date) sort last regardless of direction.
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
  }
  return String(av).localeCompare(String(bv));
}

function SortHeader({
  label,
  sortKey,
  active,
  dir,
  onClick,
}: {
  label: string;
  sortKey: SortKey;
  active: SortKey;
  dir: SortDir;
  onClick: (key: SortKey) => void;
}) {
  const isActive = active === sortKey;
  return (
    <TableHead>
      <button
        type="button"
        onClick={() => onClick(sortKey)}
        className="flex items-center gap-1 font-medium hover:text-foreground"
      >
        {label}
        {isActive ? (
          dir === "asc" ? (
            <ArrowUp size={12} />
          ) : (
            <ArrowDown size={12} />
          )
        ) : (
          <ArrowUpDown size={12} className="opacity-40" />
        )}
      </button>
    </TableHead>
  );
}

export function NavigatorListView() {
  const { open: openSidepanel } = useSidepanel();
  const project = getProjectById(DEMO_FOUNDER_PROJECT_ID);
  const allItems = useMemo(() => getNavigatorItems(), []);

  const [typeFilter, setTypeFilter] = useState<NavigatorItemType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("title");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const statusOptions = useMemo(
    () => ["all", ...Array.from(new Set(allItems.map((i) => i.status)))],
    [allItems],
  );

  const items = useMemo(() => {
    let filtered = allItems;
    if (typeFilter !== "all") filtered = filtered.filter((i) => i.type === typeFilter);
    if (statusFilter !== "all") filtered = filtered.filter((i) => i.status === statusFilter);
    const sorted = [...filtered].sort((a, b) => compare(a, b, sortKey));
    return sortDir === "asc" ? sorted : sorted.reverse();
  }, [allItems, typeFilter, statusFilter, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
      <h1 className="mb-1.5 text-xl font-semibold tracking-tight text-foreground">Navigator</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Every objective and task for {project?.name ?? "this project"}, in one sortable list.
      </p>

      <div className="mb-4 flex gap-2">
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPE_FILTERS.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((s) => (
              <SelectItem key={s} value={s}>
                {s === "all" ? "All statuses" : s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border" style={{ borderColor: "var(--skin-line)" }}>
        <Table>
          <TableHeader>
            <TableRow>
              <SortHeader
                label="Title"
                sortKey="title"
                active={sortKey}
                dir={sortDir}
                onClick={handleSort}
              />
              <SortHeader
                label="Type"
                sortKey="type"
                active={sortKey}
                dir={sortDir}
                onClick={handleSort}
              />
              <SortHeader
                label="Status"
                sortKey="status"
                active={sortKey}
                dir={sortDir}
                onClick={handleSort}
              />
              <SortHeader
                label="Owner"
                sortKey="ownerName"
                active={sortKey}
                dir={sortDir}
                onClick={handleSort}
              />
              <SortHeader
                label="Due date"
                sortKey="dueDate"
                active={sortKey}
                dir={sortDir}
                onClick={handleSort}
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow
                key={item.id}
                className="cursor-pointer"
                onClick={() =>
                  openSidepanel(
                    item.type === "objective"
                      ? { id: item.id, kind: "objective", title: item.title }
                      : { id: item.id, kind: "note", noteType: "task", title: item.title },
                  )
                }
              >
                <TableCell className="font-medium text-foreground">{item.title}</TableCell>
                <TableCell className="capitalize text-muted-foreground">{item.type}</TableCell>
                <TableCell className="text-muted-foreground">{item.status}</TableCell>
                <TableCell className="text-muted-foreground">{item.ownerName ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{item.dueDate ?? "—"}</TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No items match these filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
