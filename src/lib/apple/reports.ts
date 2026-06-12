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

/** Thrown when Apple returns 401/403, meaning searchPartyToken is dead. */
export class AppleTokensExpiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AppleTokensExpiredError";
  }
}

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
  const requestHeaders = {
    "Content-Type": "application/json",
    Authorization: `Basic ${credsB64}`,
    "User-Agent": "FindMy-Family/0.1",
    ...anisette,
  };

  // Verbose request log. dsid stays visible (it's a public Apple
  // account id), spToken is redacted to first 8 + last 4 chars so we
  // can spot whitespace / mangling without leaking the bearer.
  const dsidShown = auth.dsid;
  const tokShown =
    auth.spToken.length > 16
      ? `${auth.spToken.slice(0, 8)}…${auth.spToken.slice(-4)} (${auth.spToken.length} chars)`
      : `(${auth.spToken.length} chars)`;
  console.log("[apple/fetch] →", {
    url: "https://gateway.icloud.com/acsnservice/fetch",
    dsid: dsidShown,
    spToken: tokShown,
    ids: lookups.map((l) => l.hashedAdvKey.slice(0, 8) + "…"),
    window: {
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
    },
    anisetteMD: anisette["X-Apple-I-MD"]?.slice(0, 12) + "…",
    anisetteMDM: anisette["X-Apple-I-MD-M"]?.slice(0, 12) + "…",
    deviceId: anisette["X-Mme-Device-Id"],
  });

  const resp = await appleFetch("https://gateway.icloud.com/acsnservice/fetch", {
    method: "POST",
    headers: requestHeaders,
    body: JSON.stringify(body),
    dispatcher: appleInsecureDispatcher,
  });

  // Cache response headers + body before we branch on status so we can
  // log them even on errors. Apple's /acsnservice/fetch always returns
  // application/json (often with `{statusCode: N}` even on non-2xx).
  const responseHeaders: Record<string, string> = {};
  resp.headers.forEach((v, k) => {
    responseHeaders[k] = v;
  });
  const rawText = await resp.text();
  console.log("[apple/fetch] ← status=%d", resp.status, {
    headers: responseHeaders,
    bodyBytes: rawText.length,
    bodyHead: rawText.slice(0, 300),
  });

  if (resp.status === 401 || resp.status === 403) {
    throw new AppleTokensExpiredError(
      `apple /acsnservice/fetch returned ${resp.status} — body: ${rawText.slice(0, 200)}`,
    );
  }
  if (!resp.ok) {
    throw new Error(
      `apple /acsnservice/fetch returned ${resp.status} ${resp.statusText} — body: ${rawText.slice(0, 200)}`,
    );
  }

  // resp body was already consumed by the diagnostic log above.
  const json = JSON.parse(rawText) as {
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
