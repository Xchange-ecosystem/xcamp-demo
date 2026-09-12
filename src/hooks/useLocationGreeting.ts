// src/hooks/useLocationGreeting.ts
//
// Resolves a location- and time-of-day-aware version of the start screen's
// greeting clause ("It's a beautiful sunny afternoon in Berlin.") in the
// background, using the visitor's real coordinates.
//
// Deliberately template-based, not an LLM call: no API key to protect, no
// network round-trip on the critical path beyond the two free/keyless
// lookups below, and no failure mode worse than "keeps the static line".
// See the file's PR description for the explicit template-vs-LLM
// trade-off — swapping the final compose step for a serverless
// Anthropic call (same pattern as api/recap/extract.ts) is a small,
// isolated change if a more dynamic sentence is wanted later, but adds a
// third network hop, latency, cost, and an extra failure mode to a screen
// that runs in front of a live audience.
//
// Chain: browser Geolocation -> reverse geocode (BigDataCloud, free,
// keyless, CORS-enabled) + current weather (Open-Meteo, free, keyless) in
// parallel -> template sentence. Time-of-day comes from the *device's own
// clock* rather than a timezone lookup — for a visitor's own browser this
// already reflects their local time, and skipping a timezone API removes
// a network call and a failure mode for a distinction the greeting only
// needs at morning/afternoon/evening/night granularity.
//
// Every step is timeout-guarded and every failure (denied permission, no
// geolocation support, slow/broken network, non-OK response) is swallowed
// silently, leaving the static fallback clause in place — this screen must
// never show an error state or visibly hang waiting on it.
import { useEffect, useRef, useState } from "react";

export const STATIC_GREETING_CLAUSE = "It's a beautiful sunny afternoon in Berlin.";

const GEOLOCATION_TIMEOUT_MS = 2500;
const FETCH_TIMEOUT_MS = 1800;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        window.clearTimeout(timer);
        reject(err);
      },
    );
  });
}

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("geolocation unavailable"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      timeout: GEOLOCATION_TIMEOUT_MS,
      maximumAge: 10 * 60 * 1000,
    });
  });
}

async function fetchCity(lat: number, lon: number): Promise<string | null> {
  const res = await fetch(
    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
  );
  if (!res.ok) return null;
  const data = await res.json();
  return (data.city || data.locality || data.principalSubdivision || null) as string | null;
}

async function fetchWeatherCode(lat: number, lon: number): Promise<number | undefined> {
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=weather_code`,
  );
  if (!res.ok) return undefined;
  const data = await res.json();
  return data?.current?.weather_code as number | undefined;
}

// WMO weather codes (open-meteo's `current=weather_code`) collapsed into a
// short adjective phrase matching the style of the original hardcoded line
// ("beautiful sunny").
function weatherPhraseFromCode(code: number | undefined): string {
  if (code === 0) return "beautiful sunny";
  if (code === 1) return "bright, mostly clear";
  if (code === 2) return "partly cloudy";
  if (code === 3) return "grey, overcast";
  if (code === 45 || code === 48) return "misty foggy";
  if (code !== undefined && code >= 51 && code <= 57) return "light drizzly";
  if (code !== undefined && code >= 61 && code <= 67) return "rainy";
  if (code !== undefined && code >= 80 && code <= 82) return "showery";
  if (code !== undefined && ((code >= 71 && code <= 77) || code === 85 || code === 86))
    return "snowy";
  if (code !== undefined && code >= 95) return "stormy";
  return "mild";
}

function timeOfDayFromHour(hour: number): string {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

/**
 * Returns the greeting clause, starting as the static fallback and
 * swapping to a real "It's a {weather} {time of day} in {city}." sentence
 * if geolocation + both lookups resolve in time. Kicks off the whole chain
 * on mount so it has the entire sign-in + logo-animation window to settle
 * before a caller actually needs the value — read the latest value via a
 * ref (see PersonaStartScreen) rather than this hook's return value
 * directly if you need to freeze it once and avoid changing text mid-typewriter.
 */
export function useLocationGreetingClause(): string {
  const [clause, setClause] = useState(STATIC_GREETING_CLAUSE);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const position = await withTimeout(getPosition(), GEOLOCATION_TIMEOUT_MS);
        const { latitude, longitude } = position.coords;
        const [city, weatherCode] = await Promise.all([
          withTimeout(fetchCity(latitude, longitude), FETCH_TIMEOUT_MS).catch(() => null),
          withTimeout(fetchWeatherCode(latitude, longitude), FETCH_TIMEOUT_MS).catch(
            () => undefined,
          ),
        ]);
        if (cancelled || !city) return;
        const phrase = weatherPhraseFromCode(weatherCode);
        const timeOfDay = timeOfDayFromHour(new Date().getHours());
        setClause(`It's a ${phrase} ${timeOfDay} in ${city}.`);
      } catch {
        // Denied, unsupported, timed out, or any lookup failed — keep the
        // static fallback. Never surface an error on this screen.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return clause;
}
