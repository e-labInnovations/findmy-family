"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { initialsFromName } from "@/lib/initials";
import { COLORS, DEFAULT_COLOR_ID } from "@/lib/colors";

const COLOR_IDS = COLORS.map((c) => c.id) as [string, ...string[]];

const AddMemberSchema = z.object({
  name: z.string().trim().min(1, "Enter the member's name."),
  email: z.email("Enter a valid email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  title: z.string().trim().max(60).optional().or(z.literal("")),
  color: z.enum(COLOR_IDS).default(DEFAULT_COLOR_ID),
});

export interface AddMemberState {
  ok: boolean;
  message?: string;
}

export async function addMember(
  _prev: AddMemberState | undefined,
  formData: FormData,
): Promise<AddMemberState> {
  await requireAdmin();

  const parsed = AddMemberSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    title: formData.get("title") ?? "",
    color: formData.get("color") ?? DEFAULT_COLOR_ID,
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { name, email, password, title, color } = parsed.data;

  // unique email check (Prisma also enforces, but a nicer error first)
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return { ok: false, message: "A member with that email already exists." };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await db.user.create({
    data: {
      email,
      passwordHash,
      name,
      role: "MEMBER",
      color,
      initials: initialsFromName(name),
      title: title || null,
    },
  });

  revalidatePath("/people");
  redirect("/people");
}
