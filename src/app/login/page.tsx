import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
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
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden
            >
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
            </svg>
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
