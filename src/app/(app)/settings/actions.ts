"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { FAMILY_INFO_SINGLETON_ID } from "@/lib/family-info";

const FamilyNameSchema = z.object({
  name: z.string().trim().min(1, "Enter a name.").max(64, "Too long."),
});

export interface FamilyNameState {
  ok: boolean;
  message?: string;
}

export async function updateFamilyName(
  _prev: FamilyNameState | undefined,
  formData: FormData,
): Promise<FamilyNameState> {
  await requireAdmin();
  const parsed = FamilyNameSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Invalid name.",
    };
  }
  await db.familyInfo.upsert({
    where: { id: FAMILY_INFO_SINGLETON_ID },
    create: { id: FAMILY_INFO_SINGLETON_ID, name: parsed.data.name },
    update: { name: parsed.data.name },
  });
  revalidatePath("/settings");
  revalidatePath("/map");
  return { ok: true };
}
