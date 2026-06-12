"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth-helpers";
import { encryptAtRest } from "@/lib/crypto-at-rest";
import { parseKeysText } from "@/lib/keyfile";
import { COLORS, DEFAULT_COLOR_ID } from "@/lib/colors";
import { DEVICE_TYPES } from "@/lib/device-types";

const COLOR_IDS = COLORS.map((c) => c.id) as [string, ...string[]];
const TYPE_IDS = DEVICE_TYPES.map((t) => t.id) as [string, ...string[]];

const AddAccessorySchema = z.object({
  name: z.string().trim().min(1, "Enter a name."),
  type: z.enum(TYPE_IDS),
  color: z.enum(COLOR_IDS).default(DEFAULT_COLOR_ID),
  keys: z.string().min(1, "Paste the contents of your .keys file."),
  primaryOwnerId: z.string().min(1, "Pick a primary owner."),
  // additional owners come in as an array of user ids
  owners: z.array(z.string()).optional(),
});

export interface AddAccessoryState {
  ok: boolean;
  message?: string;
}

export async function addAccessory(
  _prev: AddAccessoryState | undefined,
  formData: FormData,
): Promise<AddAccessoryState> {
  const me = await requireUser();
  const isAdmin = me.role === "ADMIN";

  const parsed = AddAccessorySchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    color: formData.get("color") ?? DEFAULT_COLOR_ID,
    keys: formData.get("keys"),
    primaryOwnerId: formData.get("primaryOwnerId"),
    owners: formData.getAll("owners").map(String),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { name, type, color, keys, primaryOwnerId, owners } = parsed.data;

  // Non-admin members must be the primary owner of accessories they add
  // (the client UI locks this; the server is the source of truth).
  if (!isAdmin && primaryOwnerId !== me.id) {
    return {
      ok: false,
      message: "You must be the primary owner of accessories you add.",
    };
  }

  const parseRes = parseKeysText(keys);
  if (!parseRes.ok) {
    return { ok: false, message: parseRes.error };
  }
  const { privateKey, advertisementKey, hashedAdvKey } = parseRes.keys;

  // Build the full owner set: union of `owners` plus the primary,
  // dedup, then mark the primary.
  const ownerIds = Array.from(new Set([...(owners ?? []), primaryOwnerId]));
  if (!ownerIds.includes(primaryOwnerId)) {
    return { ok: false, message: "Primary owner must be in the owner list." };
  }

  // Verify all owners exist (members the admin actually has)
  const userRows = await db.user.findMany({
    where: { id: { in: ownerIds } },
    select: { id: true },
  });
  if (userRows.length !== ownerIds.length) {
    return { ok: false, message: "One or more owners no longer exist." };
  }

  // Refuse duplicate registration of the same key under different names.
  const dup = await db.accessory.findUnique({ where: { hashedAdvKey } });
  if (dup) {
    return { ok: false, message: "An accessory with this key is already registered." };
  }

  await db.accessory.create({
    data: {
      name,
      type,
      color,
      privateKeyEnc: encryptAtRest(privateKey),
      advertisementKey: advertisementKey.toString("base64"),
      hashedAdvKey,
      owners: {
        create: ownerIds.map((userId) => ({
          userId,
          isPrimary: userId === primaryOwnerId,
        })),
      },
    },
  });

  revalidatePath("/map");
  redirect("/map");
}
