import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/contexts/auth";
import { useSidepanel } from "@/contexts/sidepanel";
import { listTenantMembers, type TenantMemberSummary } from "@/lib/xcamp-api";
import { mockTagsForUser, mockContributionCountForUser } from "@/lib/ecosystemNavigatorMock";

export const Route = createFileRoute("/ecosystem-navigator")({
  head: () => ({
    meta: [
      { title: "Ecosystem Navigator — Xcamp" },
      { name: "description", content: "Browse everyone in the Xcamp ecosystem." },
    ],
  }),
  component: EcosystemNavigatorPage,
});

function EcosystemNavigatorPage() {
  return (
    <AppShell>
      <EcosystemNavigatorContent />
    </AppShell>
  );
}

// useSidepanel() needs SidepanelProvider, which AppShell mounts around its
// children — so this has to be a child of <AppShell>, not a sibling call in the
// same component that renders it.
function EcosystemNavigatorContent() {
  const { user } = useAuth();
  const { open } = useSidepanel();

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["tenant-members", user?.centralId],
    queryFn: () => listTenantMembers(user!),
    enabled: !!user,
  });

  const handleTileClick = (member: TenantMemberSummary) => {
    open({
      id: member.id,
      kind: "user",
      title: member.displayName,
      meta: {
        avatarUrl: member.avatarUrl,
        tags: mockTagsForUser(member.id),
        projectCount: member.projectCount,
        contributionCount: mockContributionCountForUser(member.id),
        // No bio field exists on central_users yet — UserProfileContent shows
        // "No bio yet." until one is added.
        bio: null,
      },
    });
  };

  return (
    <div style={{ padding: "32px 32px 48px" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--skin-ink)", marginBottom: 4 }}>
          Ecosystem Navigator
        </h1>
        <p style={{ fontSize: 14, color: "var(--skin-ink-soft)", margin: 0 }}>
          Everyone in the Xcamp ecosystem.
        </p>
      </div>

      {isLoading ? (
        <div style={{ color: "var(--skin-ink-soft)", fontSize: 14 }}>Loading…</div>
      ) : members.length === 0 ? (
        <div style={{ color: "var(--skin-ink-soft)", fontSize: 14 }}>No members found.</div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 16,
          }}
        >
          {members.map((member) => (
            <MemberTile key={member.id} member={member} onClick={() => handleTileClick(member)} />
          ))}
        </div>
      )}
    </div>
  );
}

function MemberTile({ member, onClick }: { member: TenantMemberSummary; onClick: () => void }) {
  const tags = mockTagsForUser(member.id);
  const contributionCount = mockContributionCountForUser(member.id);

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
          {member.avatarUrl ? (
            <img
              src={member.avatarUrl}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <Users size={18} />
          )}
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--skin-ink)", lineHeight: 1.3 }}>
          {member.displayName}
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
            {member.projectCount}
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
