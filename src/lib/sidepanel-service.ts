import { supabase } from "@/lib/supabase";
import type { XcampUser } from "@/types/xcamp";

export type ItemKind = "note" | "objective";

export interface ItemRef {
  id: string;
  kind: ItemKind;
  title: string;
}

export interface LinkedItem {
  id: string;
  title: string;
  kind: ItemKind;
  noteType?: string;
  status?: string;
}

export interface GraphNode {
  id: string;
  title: string;
  kind: ItemKind;
  noteType?: string;
  degree: number;
}

export interface GraphEdge {
  source: string;
  target: string;
}

export async function fetchLinkedItemsForNote(noteId: string): Promise<LinkedItem[]> {
  const { data: links } = await supabase
    .from("objective_notes")
    .select("objective_id")
    .eq("note_id", noteId);
  if (!links?.length) return [];

  const objIds = links.map((r) => r.objective_id as string);
  const { data: objs } = await supabase
    .from("objectives")
    .select("id, title, status")
    .in("id", objIds);

  return (objs ?? []).map((o) => ({
    id: o.id as string,
    title: (o.title ?? "Untitled objective") as string,
    kind: "objective" as ItemKind,
    status: o.status as string | undefined,
  }));
}

export async function fetchLinkedItemsForObjective(objectiveId: string): Promise<LinkedItem[]> {
  const { data: links } = await supabase
    .from("objective_notes")
    .select("note_id")
    .eq("objective_id", objectiveId);
  if (!links?.length) return [];

  const noteIds = links.map((r) => r.note_id as string);
  const { data: notes } = await supabase
    .from("notes")
    .select("id, title, note_type")
    .in("id", noteIds);

  return (notes ?? []).map((n) => ({
    id: n.id as string,
    title: (n.title ?? "Untitled") as string,
    kind: "note" as ItemKind,
    noteType: n.note_type as string,
  }));
}

export async function addNoteObjectiveLink(
  user: XcampUser,
  noteId: string,
  objectiveId: string,
): Promise<void> {
  const { error } = await supabase.from("objective_notes").insert({
    note_id: noteId,
    objective_id: objectiveId,
    owner_central_id: user.centralId,
    tenant_id: user.tenantId,
  });
  if (error) throw error;
}

export async function removeNoteObjectiveLink(
  noteId: string,
  objectiveId: string,
): Promise<void> {
  const { error } = await supabase
    .from("objective_notes")
    .delete()
    .eq("note_id", noteId)
    .eq("objective_id", objectiveId);
  if (error) throw error;
}

export async function removeObjectiveNoteLink(
  objectiveId: string,
  noteId: string,
): Promise<void> {
  return removeNoteObjectiveLink(noteId, objectiveId);
}

export async function fetchItemGraphData(
  itemId: string,
  itemKind: ItemKind,
): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  const nodeMap = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const edgeSet = new Set<string>();

  const addNode = (id: string, title: string, kind: ItemKind, noteType?: string) => {
    if (!nodeMap.has(id)) nodeMap.set(id, { id, title, kind, noteType, degree: 0 });
  };

  const addEdge = (source: string, target: string) => {
    const key = [source, target].sort().join("|");
    if (edgeSet.has(key)) return;
    edgeSet.add(key);
    edges.push({ source, target });
    const s = nodeMap.get(source);
    const t = nodeMap.get(target);
    if (s) s.degree++;
    if (t) t.degree++;
  };

  if (itemKind === "note") {
    addNode(itemId, "", "note");
    const { data: links1 } = await supabase
      .from("objective_notes")
      .select("objective_id")
      .eq("note_id", itemId);

    const objIds = (links1 ?? []).map((l) => l.objective_id as string);
    if (objIds.length) {
      const { data: objs } = await supabase
        .from("objectives")
        .select("id, title")
        .in("id", objIds);
      for (const obj of objs ?? []) {
        addNode(obj.id as string, obj.title as string, "objective");
        addEdge(itemId, obj.id as string);
      }

      const { data: links2 } = await supabase
        .from("objective_notes")
        .select("note_id, objective_id")
        .in("objective_id", objIds)
        .neq("note_id", itemId)
        .limit(40);

      const neighborNoteIds = [...new Set((links2 ?? []).map((l) => l.note_id as string))];
      if (neighborNoteIds.length) {
        const { data: neighborNotes } = await supabase
          .from("notes")
          .select("id, title, note_type")
          .in("id", neighborNoteIds);
        for (const n of neighborNotes ?? [])
          addNode(n.id as string, n.title as string, "note", n.note_type as string);
        for (const l of links2 ?? [])
          addEdge(l.objective_id as string, l.note_id as string);
      }
    }
  } else {
    addNode(itemId, "", "objective");
    const { data: links1 } = await supabase
      .from("objective_notes")
      .select("note_id")
      .eq("objective_id", itemId);

    const noteIds = (links1 ?? []).map((l) => l.note_id as string);
    if (noteIds.length) {
      const { data: notes } = await supabase
        .from("notes")
        .select("id, title, note_type")
        .in("id", noteIds);
      for (const n of notes ?? []) {
        addNode(n.id as string, n.title as string, "note", n.note_type as string);
        addEdge(itemId, n.id as string);
      }

      const { data: links2 } = await supabase
        .from("objective_notes")
        .select("note_id, objective_id")
        .in("note_id", noteIds)
        .neq("objective_id", itemId)
        .limit(40);

      const neighborObjIds = [...new Set((links2 ?? []).map((l) => l.objective_id as string))];
      if (neighborObjIds.length) {
        const { data: neighborObjs } = await supabase
          .from("objectives")
          .select("id, title")
          .in("id", neighborObjIds);
        for (const obj of neighborObjs ?? [])
          addNode(obj.id as string, obj.title as string, "objective");
        for (const l of links2 ?? [])
          addEdge(l.note_id as string, l.objective_id as string);
      }
    }
  }

  return { nodes: Array.from(nodeMap.values()), edges };
}

export async function searchItems(
  query: string,
  kinds: ItemKind[],
  excludeIds: string[],
  tenantId: string,
): Promise<LinkedItem[]> {
  if (!query.trim()) return [];
  const results: LinkedItem[] = [];
  const includeNotes = kinds.length === 0 || kinds.includes("note");
  const includeObjectives = kinds.length === 0 || kinds.includes("objective");

  if (includeNotes) {
    let q = supabase
      .from("notes")
      .select("id, title, note_type")
      .ilike("title", `%${query}%`)
      .eq("tenant_id", tenantId)
      .limit(8);
    if (excludeIds.length) q = q.not("id", "in", `(${excludeIds.join(",")})`);
    const { data } = await q;
    for (const n of data ?? [])
      results.push({ id: n.id as string, title: n.title as string, kind: "note", noteType: n.note_type as string });
  }

  if (includeObjectives) {
    let q = supabase
      .from("objectives")
      .select("id, title, status")
      .ilike("title", `%${query}%`)
      .limit(8);
    if (excludeIds.length) q = q.not("id", "in", `(${excludeIds.join(",")})`);
    const { data } = await q;
    for (const o of data ?? [])
      results.push({ id: o.id as string, title: o.title as string, kind: "objective", status: o.status as string | undefined });
  }

  return results;
}

// TODO: AI link suggestion — stub until backend endpoint is available
export async function suggestLinks(
  _user: XcampUser,
  _itemId: string,
  _itemKind: ItemKind,
): Promise<LinkedItem[]> {
  // TODO: POST /api/items/suggest-links when the backend endpoint exists
  return [];
}

// TODO: Promote note to objective — DB RPC exists but UI flow not yet defined
export async function promoteNoteToObjective(
  _user: XcampUser,
  _noteId: string,
): Promise<void> {
  // TODO: supabase.rpc('promote_objective_to_agreement', {...})
  throw new Error("Promote to objective: not yet implemented");
}

export function copyItemLink(id: string, kind: ItemKind): void {
  const url = `${window.location.origin}?item=${kind}:${id}`;
  void navigator.clipboard.writeText(url).catch(() => {});
}
