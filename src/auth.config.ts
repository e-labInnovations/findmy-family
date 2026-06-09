/**
 * Edge-safe Auth.js v5 config.
 *
 * No Prisma, no bcrypt — those drag in Node-only modules and crash the
 * edge runtime that middleware runs in. Only the parts middleware needs:
 * callbacks for the session shape + the pages config so unauthenticated
 * requests redirect correctly.
 *
 * The full config (with the Credentials provider that actually verifies
 * passwords) lives in src/auth.ts and extends this.
 */
import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        (token as { role?: "ADMIN" | "MEMBER" }).role =
          (user as { role?: "ADMIN" | "MEMBER" }).role;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (token.sub) session.user.id = token.sub;
      const role = (token as { role?: "ADMIN" | "MEMBER" }).role;
      if (role) session.user.role = role;
      return session;
    },
  },
} satisfies NextAuthConfig;
