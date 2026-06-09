"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { signIn } from "@/auth";
import { initialsFromName } from "@/lib/initials";

const SetupSchema = z.object({
  name: z.string().trim().min(1, "Enter your name."),
  email: z.email("Enter a valid email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export interface SetupState {
  ok: boolean;
  message?: string;
}

/**
 * Create the very first admin and sign them in. Refuses if any user
 * already exists in the DB — that closes the door on /setup being
 * used as a back-channel to promote a second admin.
 */
export async function createAdminAndSignIn(
  _prev: SetupState | undefined,
  formData: FormData,
): Promise<SetupState> {
  const parsed = SetupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { name, email, password } = parsed.data;

  // Re-check inside the transaction: only one admin allowed via setup.
  const result = await db.$transaction(async (tx) => {
    const existing = await tx.user.count();
    if (existing > 0) {
      return { kind: "exists" as const };
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await tx.user.create({
      data: {
        email,
        passwordHash,
        name,
        role: "ADMIN",
        color: "purple",
        initials: initialsFromName(name),
        title: "Family Organizer",
      },
    });
    return { kind: "created" as const, user };
  });

  if (result.kind === "exists") {
    return { ok: false, message: "Setup already complete. Sign in instead." };
  }

  // Hand off to Auth.js to mint the session. signIn() throws a
  // redirect — Next intercepts it and the browser lands on /map.
  await signIn("credentials", { email, password, redirectTo: "/map" });

  // Never reached — signIn() always throws.
  return { ok: true };
}
