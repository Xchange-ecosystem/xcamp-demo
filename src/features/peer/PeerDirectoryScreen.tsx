// Peer App — presentational carry-over of the main app's Ecosystem Navigator
// (src/routes/ecosystem-navigator.tsx), which is a live Supabase member
// directory. This is a port, not a redesign: the tile grid, tile layout, and
// the sidepanel click-through all reproduce the upstream screen exactly.
//
// What was stripped, per the B4 Phase 0 carry-over check:
//   - AppShell        — the real app's auth-gated chrome; DemoShell wraps this instead
//   - useAuth()       — only ever supplied user.tenantId to the query below
//   - listTenantMembers() (Supabase: central_users + object_memberships)
//     → PEOPLE from @/fixtures, with projectCount derived from the fixture
//       graph the same way the real query derives it from memberships
//       (ownership OR an assignment on the project), so the number means
//       the same thing it means upstream.
//
// What was kept verbatim: mockTagsForUser / mockContributionCountForUser
// (src/lib/ecosystemNavigatorMock.ts). Those were already deterministic,
// id-seeded placeholders in production — no user-tags or contributions table
// exists — so they are demo-safe as-is and are not re-implemented here.
//
// useSidepanel().open({ kind: "user" }) is safe in the demo: ItemSidepanel
// short-circuits that kind to UserProfileContent, which reads only item.meta
// and mounts no query, no auth, and no Supabase call. Traced in full in the
// B4 Phase 0 report and live-verified with network logging.
import { Users } from "lucide-react";
import { useSidepanel } from "@/contexts/sidepanel";
import { ASSIGNMENTS, PEOPLE, PROJECTS } from "@/fixtures";
import type { Person } from "@/fixtures";
import { mockContributionCountForUser, mockTagsForUser } from "@/lib/ecosystemNavigatorMock";

// Mirrors listTenantMembers' real derivation: any project the person is a
// member of, not just ones they own.
function projectCountFor(personId: string): number {
  const owned = PROJECTS.filter((p) => p.ownerId === personId).map((p) => p.id);
  const assigned = ASSIGNMENTS.filter((a) => a.assigneeId === personId).map((a) => a.projectId);
  return new Set([...owned, ...assigned]).size;
}

export function PeerDirectoryScreen() {
  const { open } = useSidepanel();

  const handleTileClick = (person: Person) => {
    open({
      id: person.id,
      kind: "user",
      title: person.displayName,
      meta: {
        avatarUrl: person.avatarUrl,
        tags: mockTagsForUser(person.id),
        projectCount: projectCountFor(person.id),
        contributionCount: mockContributionCountForUser(person.id),
        // Upstream passes null here — central_users has no bio column yet, so
        // UserProfileContent renders "No bio yet." The fixture Person carries a
        // title line instead, which is real and worth showing.
        bio: person.title,
      },
    });
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto" style={{ padding: "28px 32px 48px" }}>
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "var(--skin-ink)",
            marginBottom: 4,
            fontFamily: "var(--skin-font-head)",
          }}
        >
          Peer
        </h1>
        <p style={{ fontSize: 14, color: "var(--skin-ink-soft)", margin: 0 }}>
          Everyone in the Xcamp ecosystem. Open anyone to see what they work on.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        {PEOPLE.map((person) => (
          <MemberTile key={person.id} person={person} onClick={() => handleTileClick(person)} />
        ))}
      </div>
    </div>
  );
}

function MemberTile({ person, onClick }: { person: Person; onClick: () => void }) {
  const tags = mockTagsForUser(person.id);
  const contributionCount = mockContributionCountForUser(person.id);
  const projectCount = projectCountFor(person.id);

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        appearance: "none",
        WebkitAppearance: "none",
        border: "1px solid var(--skin-line)",
        borderRadius: 14,
        padding: 16,
        background: "var(--skin-surface)",
        cursor: "pointer",
        textAlign: "left",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        font: "inherit",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            overflow: "hidden",
            flexShrink: 0,
            background: "var(--skin-surface2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--skin-ink-faint)",
          }}
        >
          {person.avatarUrl ? (
            <img
              src={person.avatarUrl}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <Users size={18} />
          )}
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--skin-ink)", lineHeight: 1.3 }}>
          {person.displayName}
        </div>
      </div>

      {tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {tags.map((t) => (
            <span
              key={t}
              style={{
                fontSize: 11,
                padding: "2px 8px",
                borderRadius: 999,
                background: "var(--skin-surface2)",
                color: "var(--skin-ink-soft)",
              }}
            >
              {t}
            </span>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 16, marginTop: "auto" }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--skin-ink)" }}>
            {projectCount}
          </div>
          <div style={{ fontSize: 11, color: "var(--skin-ink-soft)" }}>Projects</div>
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--skin-ink)" }}>
            {contributionCount}
          </div>
          <div style={{ fontSize: 11, color: "var(--skin-ink-soft)" }}>Contributions</div>
        </div>
      </div>
    </button>
  );
}
