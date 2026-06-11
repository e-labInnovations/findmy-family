/**
 * Singleton-row helpers for the family-level settings.
 * Right now just `name`; future shared settings (timezone, default map
 * center, retention policy) belong on FamilyInfo too.
 */
import "server-only";
import { db } from "@/lib/db";

const SINGLETON_ID = "singleton";
const DEFAULT_NAME = "My Family";

/**
 * Read the current family name. Lazily creates the singleton row on
 * first call so callers don't need null-guards.
 */
export async function getFamilyName(): Promise<string> {
  const row = await db.familyInfo.upsert({
    where: { id: SINGLETON_ID },
    create: { id: SINGLETON_ID, name: DEFAULT_NAME },
    update: {},
    select: { name: true },
  });
  return row.name;
}

/** Internal — exported for the server action to share the constant. */
export const FAMILY_INFO_SINGLETON_ID = SINGLETON_ID;
