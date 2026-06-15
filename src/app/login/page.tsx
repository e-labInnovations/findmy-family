import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { BrandLogo } from "@/lib/brand-logo";
import { LoginForm } from "./login-form";

// Reads DB state + auth() each request — never prerender statically.
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  // If no users exist yet, send the user through /setup so they
  // can become the first admin.
  const userCount = await db.user.count();
  if (userCount === 0) redirect("/setup");

  // Already signed in? Skip the form.
  const session = await auth();
  if (session?.user) redirect("/map");

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-logo">
            <BrandLogo size={22} />
          </div>
          <div className="auth-wordmark">
            <span className="wm-find">Find</span>
            <span className="wm-my">My</span>
          </div>
        </div>

        <div className="auth-body">
          <h1>Sign In</h1>
          <p>Use the email and password your family organizer set up for you.</p>
          <LoginForm />
        </div>

        <div className="auth-hint">
          No account? Only your family organizer can add new members.
        </div>
      </div>
      <div className="auth-foot">Private to your household</div>
    </div>
  );
}
