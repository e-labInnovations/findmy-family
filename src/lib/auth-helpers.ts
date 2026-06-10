import { auth } from "@/auth";
import { redirect } from "next/navigation";

/**
 * Use at the top of admin-only routes / actions. Redirects to /login
 * if signed out, or throws if signed in as a non-admin. Throwing in a
 * server action surfaces a clear error rather than silently letting
 * the action through with reduced perms.
 */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role !== "ADMIN") {
    throw new Error("Admin only.");
  }
  return session.user;
}

export async function requireUser() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return session.user;
}
