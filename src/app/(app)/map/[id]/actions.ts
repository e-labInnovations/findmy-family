"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/auth-helpers";
import { COLORS, DEFAULT_COLOR_ID } from "@/lib/colors";
import { DEVICE_TYPES } from "@/lib/device-types";
import { fetchAndIngest } from "@/lib/apple/get-reports";

const COLOR_IDS = COLORS.map((c) => c.id) as [string, ...string[]];
const TYPE_IDS = DEVICE_TYPES.map((t) => t.id) as [string, ...string[]];

/**
 * Force a fresh Apple round-trip + ingest for this accessory.
 * Used by the "Refresh" button on the detail page.
 *
 * Auth: any owner OR an admin. Members can refresh their own trackers.
 */
export async function refreshAccessory(formData: FormData): Promise<void> {
  const me = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing accessory id.");

  // Ownership check: admin or one of the owners.
  if (me.role !== "ADMIN") {
    const owned = await db.accessoryOwner.findUnique({
      where: { accessoryId_userId: { accessoryId: id, userId: me.id } },
    });
    if (!owned) throw new Error("Not allowed.");
  }

  await fetchAndIngest([id], { refresh: true });
  revalidatePath(`/map/${id}`);
}

export async function removeAccessory(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing accessory id.");
  await db.accessory.delete({ where: { id } });
  revalidatePath("/map");
  redirect("/map");
}

const UpdateAccessorySchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, "Enter a name."),
  type: z.enum(TYPE_IDS),
  color: z.enum(COLOR_IDS).default(DEFAULT_COLOR_ID),
  primaryOwnerId: z.string().min(1, "Pick a primary owner."),
  owners: z.array(z.string()).optional(),
});

export interface UpdateAccessoryState {
  ok: boolean;
  message?: string;
}

export async function updateAccessory(
  _prev: UpdateAccessoryState | undefined,
  formData: FormData,
): Promise<UpdateAccessoryState> {
  await requireAdmin();

  const parsed = UpdateAccessorySchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    type: formData.get("type"),
    color: formData.get("color") ?? DEFAULT_COLOR_ID,
    primaryOwnerId: formData.get("primaryOwnerId"),
    owners: formData.getAll("owners").map(String),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { id, name, type, color, primaryOwnerId, owners } = parsed.data;

  const ownerIds = Array.from(new Set([...(owners ?? []), primaryOwnerId]));
  const users = await db.user.findMany({
    where: { id: { in: ownerIds } },
    select: { id: true },
  });
  if (users.length !== ownerIds.length) {
    return { ok: false, message: "One or more owners no longer exist." };
  }

  // Replace owners atomically alongside the scalar updates.
  await db.$transaction([
    db.accessoryOwner.deleteMany({ where: { accessoryId: id } }),
    db.accessory.update({
      where: { id },
      data: {
        name,
        type,
        color,
        owners: {
          create: ownerIds.map((userId) => ({
            userId,
            isPrimary: userId === primaryOwnerId,
          })),
        },
      },
    }),
  ]);

  revalidatePath("/map");
  revalidatePath(`/map/${id}`);
  redirect(`/map/${id}`);
}
