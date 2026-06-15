import { useCallback, useEffect, useState } from "react";

/**
 * Hero image picker backed by the Xcamp Foundation Supabase Storage bucket.
 * Falls back to a gradient if the bucket can't be listed.
 */

const SUPABASE_URL = "https://ueebzuleyrnsrxbowdfa.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlZWJ6dWxleXJuc3J4Ym93ZGZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNTQ1MTYsImV4cCI6MjA5NTYzMDUxNn0.Tt4kYbQ94kzXlOVVPZFWBxLdVFpB4kyynN9Ui0ANkEs";
const BUCKET = "App media";
const FOLDER = "Hero";

const IMG_RE = /\.(png|jpe?g|webp|avif|gif)$/i;

let cachedUrls: string[] | null = null;
let inflight: Promise<string[]> | null = null;
let warnedEmpty = false;

function publicUrl(path: string): string {
  const segs = [BUCKET, ...path.split("/")].map(encodeURIComponent).join("/");
  return `${SUPABASE_URL}/storage/v1/object/public/${segs}`;
}

async function loadHeroUrls(): Promise<string[]> {
  if (cachedUrls) return cachedUrls;
  if (inflight) return inflight;
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];

  inflight = (async () => {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/storage/v1/object/list/${encodeURIComponent(BUCKET)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
          body: JSON.stringify({
            prefix: FOLDER,
            limit: 100,
            sortBy: { column: "name", order: "asc" },
          }),
        },
      );
      if (!res.ok) {
        if (!warnedEmpty) {
          warnedEmpty = true;
          console.warn(`[useHeroImage] Storage list failed (${res.status}).`);
        }
        return [];
      }
      const data = (await res.json()) as Array<{ name?: string }>;
      const files = (data ?? []).filter((f) => f.name && IMG_RE.test(f.name));
      const urls = files.map((f) => publicUrl(`${FOLDER}/${f.name}`));
      cachedUrls = urls;
      return urls;
    } catch (e) {
      if (!warnedEmpty) {
        warnedEmpty = true;
        console.warn("[useHeroImage] Storage list error", e);
      }
      return [];
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const decoded = new Set<string>();

function preload(url: string): Promise<string> {
  if (decoded.has(url)) return Promise.resolve(url);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      decoded.add(url);
      resolve(url);
    };
    img.onerror = () => resolve(url);
    img.src = url;
  });
}

void loadHeroUrls();

export function useHeroImage(seed?: string): {
  url: string | null;
  reload: () => void;
  canReload: boolean;
} {
  const [url, setUrl] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let cancelled = false;
    loadHeroUrls().then(async (urls) => {
      if (cancelled || urls.length === 0) return;
      const idx = seed
        ? hash(seed + revision) % urls.length
        : Math.floor(Math.random() * urls.length);
      const picked = urls[idx];
      const ready = await preload(picked);
      if (!cancelled) setUrl(ready);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, revision]);

  const reload = useCallback(() => {
    setRevision((r) => r + 1);
  }, []);

  const canReload =
    Boolean(seed) || (cachedUrls !== null && (cachedUrls?.length ?? 0) > 1);

  return { url, reload, canReload };
}
