"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";

export async function removeMember(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing member id.");
  if (id === admin.id) {
    throw new Error("You can't remove yourself.");
  }

  const target = await db.user.findUnique({ where: { id } });
  if (!target) throw new Error("Member not found.");
  if (target.role === "ADMIN") {
    throw new Error("Can't remove the family organizer.");
  }

  // Owner rows cascade via Prisma; the user's accessories stay (they'll
  // just have one less owner — admin can reassign them after).
  await db.user.delete({ where: { id } });

  revalidatePath("/people");
  redirect("/people");
}
