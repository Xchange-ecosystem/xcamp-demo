// Deterministic per-person avatar color — same person always gets the same
// color, derived from a hash of their display name. Ported from the
// approved Founder Home prototype (P1 chat artifact); shared here so every
// avatar render site (RightColumn, ProposalModal, TranscriptOverlay) picks
// the same color for the same name instead of each defining its own gray
// fallback.
const AVATAR_PALETTE = [
  { bg: "#e0f5ef", fg: "#0f7a5c" },
  { bg: "#fdeee2", fg: "#c2622a" },
  { bg: "#eef0fd", fg: "#4c4fd6" },
  { bg: "#fdeaf0", fg: "#c23d6b" },
  { bg: "#eafbe7", fg: "#3f8f2e" },
  { bg: "#f1eefd", fg: "#7440c9" },
] as const;

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function avatarColor(name: string): { bg: string; fg: string } {
  return AVATAR_PALETTE[hashStr(name) % AVATAR_PALETTE.length];
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
