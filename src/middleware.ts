/**
 * Route gating.
 *
 * - /setup and /login are always reachable
 * - /api/auth/* is reachable (Auth.js handlers)
 * - everything else requires a session
 *
 * Server components do the final "user exists?" + "is admin?" checks;
 * middleware only handles the "signed in vs not" cut.
 */
import { auth } from "@/auth";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = ["/setup", "/login"];

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const path = nextUrl.pathname;

  if (path.startsWith("/api/auth")) return NextResponse.next();
  if (PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  if (!session?.user) {
    const url = new URL("/login", nextUrl.origin);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  // Skip Next.js internals and static files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.[^/]+$).*)"],
};
