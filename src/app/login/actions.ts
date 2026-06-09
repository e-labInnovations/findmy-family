"use server";

import { z } from "zod";
import { signIn } from "@/auth";
import { AuthError } from "next-auth";

const LoginSchema = z.object({
  email: z.email("Enter a valid email."),
  password: z.string().min(1, "Enter your password."),
});

export interface LoginState {
  ok: boolean;
  message?: string;
}

export async function signInWithCredentials(
  _prev: LoginState | undefined,
  formData: FormData,
): Promise<LoginState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/map",
    });
  } catch (err) {
    // signIn throws a redirect on success — let Next handle it.
    // Auth.js throws AuthError on bad credentials etc.
    if (err instanceof AuthError) {
      return { ok: false, message: "Wrong email or password." };
    }
    throw err;
  }
  return { ok: true };
}
