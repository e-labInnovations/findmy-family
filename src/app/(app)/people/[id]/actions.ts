"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/auth-helpers";
import { COLORS, DEFAULT_COLOR_ID } from "@/lib/colors";
import { initialsFromName } from "@/lib/initials";

const COLOR_IDS = COLORS.map((c) => c.id) as [string, ...string[]];

const UpdateMemberSchema = z.object({
  id: z.string().min(1),
  // Name is admin-only; the form omits this field for self-edit and
  // we fall back to the existing value.
  name: z.string().trim().optional(),
  title: z.string().trim().optional(),
  color: z.enum(COLOR_IDS).default(DEFAULT_COLOR_ID),
  // Blank = leave existing password unchanged.
  password: z.string().optional(),
});

export interface UpdateMemberState {
  ok: boolean;
  message?: string;
}

export async function updateMember(
  _prev: UpdateMemberState | undefined,
  formData: FormData,
): Promise<UpdateMemberState> {
  // Allow self-edit OR admin-edit-anyone. Name + email + role stay
  // admin-only; members can change their own avatar, title, password.
  const me = await requireUser();

  const parsed = UpdateMemberSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    title: formData.get("title"),
    color: formData.get("color") ?? DEFAULT_COLOR_ID,
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { id, name, title, color, password } = parsed.data;

  const isAdmin = me.role === "ADMIN";
  if (!isAdmin && me.id !== id) {
    return { ok: false, message: "Not allowed." };
  }

  const existing = await db.user.findUnique({ where: { id } });
  if (!existing) return { ok: false, message: "Member not found." };

  // Non-admin self-edit keeps existing name; admins can rename.
  const nextName = isAdmin && name ? name : existing.name;

  const data: Parameters<typeof db.user.update>[0]["data"] = {
    name: nextName,
    title: title || null,
    color,
    initials: initialsFromName(nextName) || existing.initials,
  };
  if (password && password.length > 0) {
    if (password.length < 8) {
      return { ok: false, message: "Password must be at least 8 characters." };
    }
    data.passwordHash = await bcrypt.hash(password, 12);
  }

  await db.user.update({ where: { id }, data });

  revalidatePath("/people");
  revalidatePath(`/people/${id}`);
  // Members don't have access to /people/[id] (admin-only), so send them
  // back to /settings on self-edit.
  redirect(isAdmin ? `/people/${id}` : "/settings");
}

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
