// Mock values for the Ecosystem Navigator's user tiles (Phase 0 doublecheck punch list).
// "Number of projects" (see listTenantMembers in xcamp-api.ts) is real. Tags and
// "number of contributions" are NOT — there is no user-tags table and no contributions
// table in the schema today, so these are deterministic, illustrative placeholders
// keyed by user id (stable across reloads, not randomized) until real data exists.

const MOCK_TAG_POOL = ["Design", "Growth", "Product", "Engineering", "Ops", "Finance", "Marketing", "Research"];

function hashSeed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

export function mockTagsForUser(userId: string): string[] { // MOCK — no user-tags table exists yet
  const seed = hashSeed(userId);
  const count = 1 + (seed % 3);
  const tags: string[] = [];
  for (let i = 0; i < count; i++) {
    tags.push(MOCK_TAG_POOL[(seed + i * 7) % MOCK_TAG_POOL.length]);
  }
  return [...new Set(tags)];
}

export function mockContributionCountForUser(userId: string): number { // MOCK — no contributions table exists yet
  return hashSeed(userId) % 47;
}
