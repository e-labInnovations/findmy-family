import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";

/**
 * Root router. Three states:
 *   - no users yet      → /setup (first run, becomes admin)
 *   - user signed in    → /map
 *   - users exist but
 *     this caller isn't → /login
 */
export default async function Home() {
  const userCount = await db.user.count();
  if (userCount === 0) redirect("/setup");

  const session = await auth();
  if (!session?.user) redirect("/login");

  redirect("/map");
}
