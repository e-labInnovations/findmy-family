/**
 * Server-side helper: load AppleAccount tokens + accessory keys, call
 * Apple's /acsnservice/fetch, decrypt the matching reports, return
 * them grouped by accessory.
 *
 * Returns null (rather than throwing) when:
 *   - no AppleAccount row exists (admin hasn't linked yet)
 *   - the tokens have expired (caller should re-link)
 *
 * Throws on network/decrypt errors so callers can show "couldn't
 * reach Apple, try again" without confusing it with "never linked".
 */
import "server-only";
import { db } from "@/lib/db";
import { decryptAtRest } from "@/lib/crypto-at-rest";
import { fetchReports, type ReportResult } from "./reports";

export interface ReportsForAccessory {
  accessoryId: string;
  /** Most recent report by datePublished, or null if no reports in the window. */
  latest: ReportResult | null;
  /** All reports returned by Apple for this accessory, newest first. */
  all: ReportResult[];
}

/**
 * Pulls reports for a single accessory id. Convenience wrapper around
 * fetchReportsFor when the caller only cares about one accessory.
 */
export async function getReportsForAccessory(
  accessoryId: string,
  options: { days?: number } = {},
): Promise<ReportsForAccessory | null> {
  const all = await fetchReportsFor([accessoryId], options);
  if (all === null) return null;
  return all.find((r) => r.accessoryId === accessoryId) ?? {
    accessoryId,
    latest: null,
    all: [],
  };
}

/**
 * Pulls reports for a batch of accessory ids in a single Apple call.
 * Use this from /map (which renders many accessories) instead of
 * looping getReportsForAccessory.
 */
export async function fetchReportsFor(
  accessoryIds: string[],
  options: { days?: number } = {},
): Promise<ReportsForAccessory[] | null> {
  if (accessoryIds.length === 0) return [];

  const account = await db.appleAccount.findUnique({ where: { id: "singleton" } });
  if (!account) return null;
  if (account.expiresAt.getTime() < Date.now()) return null;

  const accessories = await db.accessory.findMany({
    where: { id: { in: accessoryIds } },
    select: { id: true, privateKeyEnc: true, hashedAdvKey: true },
  });

  const lookups = accessories.map((a) => ({
    hashedAdvKey: a.hashedAdvKey,
    privateKey: decryptAtRest(a.privateKeyEnc),
  }));
  const byHash = new Map(accessories.map((a) => [a.hashedAdvKey, a.id]));

  const dsid = decryptAtRest(account.dsidEnc).toString("utf-8");
  const spToken = decryptAtRest(account.spTokenEnc).toString("utf-8");

  const flat = await fetchReports({ dsid, spToken }, lookups, options);

  // Group by accessory id; sort each group newest first.
  const grouped = new Map<string, ReportResult[]>();
  for (const r of flat) {
    const accId = byHash.get(r.hashedAdvKey);
    if (!accId) continue;
    const list = grouped.get(accId) ?? [];
    list.push(r);
    grouped.set(accId, list);
  }
  return accessories.map((a) => {
    const list = (grouped.get(a.id) ?? []).sort((x, y) => y.timestamp - x.timestamp);
    return {
      accessoryId: a.id,
      latest: list[0] ?? null,
      all: list,
    };
  });
}
