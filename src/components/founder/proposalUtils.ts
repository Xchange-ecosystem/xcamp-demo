// Part 4 support: FeedItem/composer text carry no time/value estimate in
// the shared fixtures (src/fixtures/feed.ts's FeedItem has no such field),
// so the proposal modal needs *something* plausible to prefill. Synthesized
// deterministically (same input always gives the same output — no
// re-render flicker) and scaled to the real range already established by
// src/fixtures/wallet.ts's WalletEntry.amount values (40-300).
const TIME_OPTIONS = ["2h", "3h", "4h", "6h", "1d"] as const;

function hashString(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function synthesizeEstimate(seed: string): { time: string; value: number } {
  const h = hashString(seed);
  const time = TIME_OPTIONS[h % TIME_OPTIONS.length];
  const value = 60 + (h % 20) * 12; // 60..288, step 12 — same spread as WALLET_ENTRIES
  return { time, value };
}
