/**
 * Server-side helper: load AppleAccount tokens + accessory keys, call
 * Apple's /acsnservice/fetch, upsert decrypted reports into the
 * LocationReport table, then return the union of (fresh + historical).
 *
 * Apple's window is 7 days. Once we have any history for an accessory
 * we narrow the query window to (lastIngestedAt - 1h, now) so we don't
 * waste a 7-day query just to find one new ping. The -1h overlap
 * absorbs clock skew and ensures we never lose a report on the seam.
 *
 * Returns null (rather than throwing) when the admin hasn't linked an
 * Apple Account yet — caller distinguishes "never had any data" from
 * "Apple is down" by catching the throw separately.
 */
import "server-only";
import { db } from "@/lib/db";
import { decryptAtRest } from "@/lib/crypto-at-rest";
import { reverseGeocode } from "@/lib/geocode";
import { fetchReports, type ReportResult } from "./reports";

export interface ReportsForAccessory {
  accessoryId: string;
  /** Most recent report ever ingested, or null if none. */
  latest: HistoricalReport | null;
  /** All historical reports for this accessory, newest first. */
  all: HistoricalReport[];
}

export interface HistoricalReport {
  lat: number;
  lng: number;
  confidence: number;
  status: number;
  /** Seconds since Unix epoch — when the finder phone saw the tracker. */
  timestamp: number;
  /** Milliseconds since Unix epoch — when Apple recorded the relay. */
  publishedAt: number;
  /** Reverse-geocoded human place (cached). Null if uncached / Nominatim down. */
  place?: string | null;
}

/**
 * Convenience wrapper for single-accessory pages.
 * Actively reverse-geocodes the latest report (detail pages can afford
 * the Nominatim round-trip — the bulk list path can't).
 */
export async function getReportsForAccessory(
  accessoryId: string,
  options: { days?: number; refresh?: boolean } = {},
): Promise<ReportsForAccessory | null> {
  const all = await fetchAndIngest([accessoryId], options);
  if (all === null) return null;
  const result = all[0] ?? { accessoryId, latest: null, all: [] };

  // Live-geocode the latest pin so the detail-page user gets a name on
  // first visit. Older history points stay cache-only (rate limit).
  if (result.latest) {
    const place = await reverseGeocode(result.latest.lat, result.latest.lng);
    result.latest = { ...result.latest, place };
  }
  return result;
}

/** Bulk version used by /map (single Apple call for the whole list). */
export async function fetchAndIngest(
  accessoryIds: string[],
  options: { days?: number; refresh?: boolean } = {},
): Promise<ReportsForAccessory[] | null> {
  if (accessoryIds.length === 0) return [];

  const account = await db.appleAccount.findUnique({ where: { id: "singleton" } });
  if (!account) return null;
  const tokensExpired = account.expiresAt.getTime() < Date.now();

  const accessories = await db.accessory.findMany({
    where: { id: { in: accessoryIds } },
    select: { id: true, privateKeyEnc: true, hashedAdvKey: true },
  });
  const byHash = new Map(accessories.map((a) => [a.hashedAdvKey, a.id]));

  // Skip Apple roundtrip if tokens are expired — fall through to DB-only
  // history so the page still renders.
  if (!tokensExpired) {
    // Compute per-accessory ingest window. We use a single Apple call for
    // the whole batch, so the window must be the WIDEST across all
    // accessories (per-accessory pruning happens after we have the data).
    const lastTimestamps = await db.locationReport.groupBy({
      by: ["accessoryId"],
      where: { accessoryId: { in: accessoryIds } },
      _max: { timestamp: true },
    });
    const widestStart = computeStart(lastTimestamps, options.days ?? 7);
    const endDate = Date.now();

    const lookups = accessories.map((a) => ({
      hashedAdvKey: a.hashedAdvKey,
      privateKey: decryptAtRest(a.privateKeyEnc),
    }));

    const dsid = decryptAtRest(account.dsidEnc).toString("utf-8");
    const spToken = decryptAtRest(account.spTokenEnc).toString("utf-8");

    const flat = await fetchReports(
      { dsid, spToken },
      lookups,
      { startDateMs: widestStart, endDateMs: endDate },
    );

    if (flat.length > 0) {
      await persistReports(flat, byHash);
    }
  }

  // Read EVERYTHING for these accessories — that's what "history" buys us.
  // If a tracker has years of data, the detail page will cap rendering;
  // bulk callers can apply their own slice.
  const rows = await db.locationReport.findMany({
    where: { accessoryId: { in: accessoryIds } },
    orderBy: { timestamp: "desc" },
  });

  // Cache-only place enrichment across ALL trail points, not just the
  // latest — otherwise history items past index 0 always render as
  // "lat, lng" even when their coord IS cached.
  const uniqueKeys = new Map<string, { latRound: number; lngRound: number }>();
  for (const r of rows) {
    const latRound = Math.round(r.lat * 10_000) / 10_000;
    const lngRound = Math.round(r.lng * 10_000) / 10_000;
    const key = `${latRound},${lngRound}`;
    if (!uniqueKeys.has(key)) uniqueKeys.set(key, { latRound, lngRound });
  }
  const cachedPlaces =
    uniqueKeys.size === 0
      ? []
      : await db.geocodeCache.findMany({
          where: {
            OR: Array.from(uniqueKeys.values()).map((k) => ({
              latRound: k.latRound,
              lngRound: k.lngRound,
            })),
          },
        });
  const placeByKey = new Map(
    cachedPlaces.map((c) => [`${c.latRound},${c.lngRound}`, c.place]),
  );

  const grouped = new Map<string, HistoricalReport[]>();
  for (const r of rows) {
    const list = grouped.get(r.accessoryId) ?? [];
    const latRound = Math.round(r.lat * 10_000) / 10_000;
    const lngRound = Math.round(r.lng * 10_000) / 10_000;
    list.push({
      lat: r.lat,
      lng: r.lng,
      confidence: r.confidence,
      status: r.status,
      timestamp: Math.floor(r.timestamp.getTime() / 1000),
      publishedAt: r.publishedAt.getTime(),
      place: placeByKey.get(`${latRound},${lngRound}`) ?? null,
    });
    grouped.set(r.accessoryId, list);
  }

  // Background-enrich uncached coords. reverseGeocode persists into
  // GeocodeCache; subsequent visits (or refresh) hydrate `place` from
  // cache. Capped per request so a long history doesn't drown the
  // 1-req/sec Nominatim queue. Errors swallowed — best-effort.
  const fired = new Set<string>();
  const FIRE_CAP = 25;
  outer: for (const r of rows) {
    const latRound = Math.round(r.lat * 10_000) / 10_000;
    const lngRound = Math.round(r.lng * 10_000) / 10_000;
    const key = `${latRound},${lngRound}`;
    if (placeByKey.has(key)) continue;
    if (fired.has(key)) continue;
    fired.add(key);
    void reverseGeocode(r.lat, r.lng).catch(() => undefined);
    if (fired.size >= FIRE_CAP) break outer;
  }

  return accessories.map((a) => {
    const list = grouped.get(a.id) ?? [];
    return { accessoryId: a.id, latest: list[0] ?? null, all: list };
  });
}

async function persistReports(
  flat: ReportResult[],
  byHash: Map<string, string>,
) {
  // Each report becomes one upsert. Composite unique (accessoryId, timestamp)
  // means duplicates are no-ops. We batch in a tx so partial failures don't
  // leave half-ingested gaps.
  await db.$transaction(
    flat
      .map((r) => {
        const accessoryId = byHash.get(r.hashedAdvKey);
        if (!accessoryId) return null;
        const ts = new Date(r.timestamp * 1000);
        return db.locationReport.upsert({
          where: {
            accessoryId_timestamp: { accessoryId, timestamp: ts },
          },
          create: {
            accessoryId,
            lat: r.lat,
            lng: r.lng,
            confidence: r.confidence,
            status: r.status,
            timestamp: ts,
            publishedAt: new Date(r.publishedAt ?? r.timestamp * 1000),
            payload: r.payload,
            statusCode: r.statusCode ?? 0,
          },
          update: {}, // unchanged on re-ingest
        });
      })
      .filter((q): q is NonNullable<typeof q> => q !== null),
  );
}

function computeStart(
  perAccessory: Array<{ accessoryId: string; _max: { timestamp: Date | null } }>,
  fallbackDays: number,
): number {
  const fallbackStart = Date.now() - fallbackDays * 24 * 60 * 60 * 1000;
  if (perAccessory.length === 0) return fallbackStart;
  // Earliest "last seen" across the batch. -1h overlap.
  const earliest = perAccessory.reduce<number>((min, row) => {
    const ts = row._max.timestamp?.getTime();
    if (ts == null) return fallbackStart;
    return Math.min(min, ts);
  }, Number.POSITIVE_INFINITY);
  if (earliest === Number.POSITIVE_INFINITY) return fallbackStart;
  return earliest - 60 * 60 * 1000;
}
