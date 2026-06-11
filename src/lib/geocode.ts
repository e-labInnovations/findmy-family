/**
 * Reverse geocoding via Nominatim (OpenStreetMap's free endpoint).
 *
 * Apple gives us raw lat/lng; users want "Vazhayila, Trivandrum". This
 * helper:
 *   1. Rounds the coords to 4 decimals (~11m precision) for the cache key
 *      so nearby pings hit the same row instead of each one round-tripping.
 *   2. Checks GeocodeCache; returns cached `place` if present.
 *   3. Otherwise queues a request at ≤ 1 req/sec (Nominatim TOS) with a
 *      meaningful User-Agent, persists the result, and returns it.
 *   4. On any failure (network, Nominatim 429, malformed JSON) returns
 *      null so the caller falls back to raw coords — never throws.
 *
 * NOMINATIM_UA env var should be set to something like
 *   "FindMy-Family/0.1 (admin@yourdomain.example)"
 * Nominatim rejects requests with a generic UA.
 */
import "server-only";
import { db } from "@/lib/db";

const ENDPOINT = "https://nominatim.openstreetmap.org/reverse";
const DEFAULT_UA = "FindMy-Family/0.1 (self-hosted)";

/** Globally serialize Nominatim requests to ≤ 1/sec. */
let pendingTail: Promise<unknown> = Promise.resolve();
function gate<T>(task: () => Promise<T>): Promise<T> {
  const next = pendingTail.then(async () => {
    const out = await task();
    // Force a 1.1s gap between requests (Nominatim asks ≤ 1/sec).
    await new Promise((r) => setTimeout(r, 1100));
    return out;
  });
  // Don't propagate task failures into pendingTail — keep the queue alive.
  pendingTail = next.catch(() => undefined);
  return next;
}

function roundCoord(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}

/**
 * Best-effort reverse geocode. Returns the cached or freshly-fetched
 * place name, or null when Nominatim is unreachable / hasn't been
 * called yet AND we're skipping (see `noFetch`).
 *
 * Pass `noFetch: true` from hot read paths (e.g. list view) where you
 * only want a cache hit — Nominatim is too slow to gate page loads on.
 * Detail pages can afford the round-trip.
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
  options: { noFetch?: boolean } = {},
): Promise<string | null> {
  const latRound = roundCoord(lat);
  const lngRound = roundCoord(lng);

  const cached = await db.geocodeCache.findUnique({
    where: { latRound_lngRound: { latRound, lngRound } },
  });
  if (cached) return cached.place;
  if (options.noFetch) return null;

  return gate(async () => {
    try {
      const url = `${ENDPOINT}?lat=${lat}&lon=${lng}&format=json&zoom=14&addressdetails=1`;
      const resp = await fetch(url, {
        headers: {
          "User-Agent": process.env.NOMINATIM_UA || DEFAULT_UA,
          "Accept-Language": "en",
        },
      });
      if (!resp.ok) return null;
      const json = (await resp.json()) as {
        display_name?: string;
        address?: Record<string, string>;
      };
      const place = formatPlace(json) ?? json.display_name;
      if (!place) return null;
      await db.geocodeCache.upsert({
        where: { latRound_lngRound: { latRound, lngRound } },
        create: { latRound, lngRound, place },
        update: { place },
      });
      return place;
    } catch (e) {
      console.error("[geocode] failed:", e);
      return null;
    }
  });
}

/**
 * Pick a short "neighborhood, city" string from Nominatim's address dict.
 * Fields vary wildly by country — we try the most useful pairs in order.
 */
function formatPlace(json: {
  display_name?: string;
  address?: Record<string, string>;
}): string | null {
  const a = json.address;
  if (!a) return null;
  const local =
    a.suburb ||
    a.neighbourhood ||
    a.village ||
    a.hamlet ||
    a.town ||
    a.locality ||
    a.road;
  const city = a.city || a.town || a.county || a.state;
  if (local && city && local !== city) return `${local}, ${city}`;
  if (local) return local;
  if (city) return city;
  return null;
}
