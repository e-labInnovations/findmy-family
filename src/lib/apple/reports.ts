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

export interface ReportLookup {
  /** SHA-256(P.x) base64 — matches a row in Accessory.hashedAdvKey */
  hashedAdvKey: string;
  /** 28-byte big-endian P-224 private scalar */
  privateKey: Buffer;
}

export interface ReportResult extends DecryptedReport {
  hashedAdvKey: string;
}

/**
 * Query Apple, decrypt all matched reports, return them grouped per accessory.
 *
 * `days` is how far back Apple should look. Max ~7 (Apple's retention).
 */
export async function fetchReports(
  auth: { dsid: string; spToken: string },
  lookups: ReportLookup[],
  options: { days?: number } = {},
): Promise<ReportResult[]> {
  const days = options.days ?? 7;
  const endDate = Date.now();
  const startDate = endDate - days * 24 * 60 * 60 * 1000;

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

  const resp = await fetch("https://gateway.icloud.com/acsnservice/fetch", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${credsB64}`,
      "User-Agent": "FindMy-Family/0.1",
    },
    body: JSON.stringify(body),
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
      out.push({ ...dec, hashedAdvKey: r.id });
    } catch (e) {
      // log + skip; one bad report shouldn't fail the whole query
      console.error(`failed to decrypt report for ${r.id}:`, e);
    }
  }

  return out;
}
