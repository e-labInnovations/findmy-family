/**
 * Apple FindMy report fetching.
 *
 * POST to gateway.icloud.com/acsnservice/fetch with:
 *   Authorization: Basic base64(dsid + ":" + searchPartyToken)
 *   body: { search: [{ startDate, endDate, ids: [hashedAdvKeyB64, ...] }] }
 *
 * Returns: { results: [{ id, payload, datePublished, statusCode, ... }] }
 *
 * For each accessory we want reports for, we:
 *   1. Look up its hashedAdvKey (SHA-256(P.x), base64)
 *   2. Add it to the ids array
 *   3. POST to Apple
 *   4. For each result, decrypt with the matching accessory's privateKey
 *      via decryptReport() in ./crypto.ts
 */

import { decryptReport, type DecryptedReport } from "./crypto";
import { appleFetch, appleInsecureDispatcher } from "./gsa-transport";
import { buildAnisetteEnvelope } from "./gsa-headers";

export interface ReportLookup {
  /** SHA-256(P.x) base64 — matches a row in Accessory.hashedAdvKey */
  hashedAdvKey: string;
  /** 28-byte big-endian P-224 private scalar */
  privateKey: Buffer;
}

export interface ReportResult extends DecryptedReport {
  hashedAdvKey: string;
  /** Raw base64 payload from Apple — kept for persistence/audit. */
  payload: string;
  /** Apple's datePublished (ms since epoch) if present. */
  publishedAt?: number;
  /** Per-report statusCode from Apple. Usually 0. */
  statusCode?: number;
}

/**
 * Query Apple, decrypt all matched reports.
 *
 * Pass startDateMs/endDateMs explicitly when caller has a narrower window
 * (e.g. an incremental ingest based on the last persisted timestamp).
 * Defaults to the full 7-day window (Apple's max retention).
 */
export async function fetchReports(
  auth: { dsid: string; spToken: string },
  lookups: ReportLookup[],
  options: { days?: number; startDateMs?: number; endDateMs?: number } = {},
): Promise<ReportResult[]> {
  const endDate = options.endDateMs ?? Date.now();
  const startDate =
    options.startDateMs ?? endDate - (options.days ?? 7) * 24 * 60 * 60 * 1000;

  const body = {
    search: [
      {
        startDate,
        endDate,
        ids: lookups.map((l) => l.hashedAdvKey),
      },
    ],
  };

  const credsB64 = Buffer.from(`${auth.dsid}:${auth.spToken}`).toString("base64");

  const anisette = await buildAnisetteEnvelope();
  const resp = await appleFetch("https://gateway.icloud.com/acsnservice/fetch", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${credsB64}`,
      "User-Agent": "FindMy-Family/0.1",
      ...anisette,
    },
    body: JSON.stringify(body),
    dispatcher: appleInsecureDispatcher,
  });

  if (!resp.ok) {
    throw new Error(`apple /acsnservice/fetch returned ${resp.status} ${resp.statusText}`);
  }

  const json = (await resp.json()) as {
    results: Array<{
      id: string; // hashedAdvKey
      payload: string; // base64
      datePublished?: number;
      statusCode?: number;
    }>;
  };

  // index private keys by hashedAdvKey for the decrypt step
  const privKeyByHash = new Map(lookups.map((l) => [l.hashedAdvKey, l.privateKey]));

  const out: ReportResult[] = [];
  for (const r of json.results || []) {
    const priv = privKeyByHash.get(r.id);
    if (!priv) continue;
    try {
      const dec = decryptReport(r.payload, priv);
      out.push({
        ...dec,
        hashedAdvKey: r.id,
        payload: r.payload,
        publishedAt: r.datePublished,
        statusCode: r.statusCode,
      });
    } catch (e) {
      // log + skip; one bad report shouldn't fail the whole query
      console.error(`failed to decrypt report for ${r.id}:`, e);
    }
  }

  return out;
}
