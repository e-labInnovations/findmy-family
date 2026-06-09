/**
 * Auth.js v5 (NextAuth 5 beta) config.
 *
 * Member auth: email + password, verified against the User table.
 * Sessions: JWT (Credentials provider doesn't support DB sessions).
 *
 * Usage in server code:
 *   import { auth, signIn, signOut } from '@/auth';
 *   const session = await auth();
 *
 * Usage in route handlers (just the API mounting):
 *   src/app/api/auth/[...nextauth]/route.ts re-exports handlers.GET/POST.
 */
import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: "ADMIN" | "MEMBER";
    };
  }
  interface User {
    role?: "ADMIN" | "MEMBER";
  }
}

const CredentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const { auth, handlers, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Family credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (rawCreds) => {
        const parsed = CredentialsSchema.safeParse(rawCreds);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const user = await db.user.findUnique({ where: { email } });
        if (!user) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        (token as { role?: "ADMIN" | "MEMBER" }).role = user.role;
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
});
