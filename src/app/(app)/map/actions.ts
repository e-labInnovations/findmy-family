"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth-helpers";
import { fetchAndIngest } from "@/lib/apple/get-reports";

/**
 * Force-refresh every accessory visible to the current user.
 * Used by the Refresh button on /map.
 */
export async function refreshAllVisible(): Promise<void> {
  const me = await requireUser();
  const visible = await db.accessory.findMany({
    where: me.role === "ADMIN" ? undefined : { owners: { some: { userId: me.id } } },
    select: { id: true },
  });
  await fetchAndIngest(
    visible.map((a) => a.id),
    { refresh: true },
  );
  revalidatePath("/map");
}
