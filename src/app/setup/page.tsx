import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { SetupForm } from "./setup-form";

/**
 * First-run only. If any user already exists, the door is closed
 * and we bounce to login.
 */
export default async function SetupPage() {
  const userCount = await db.user.count();
  if (userCount > 0) redirect("/login");

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
          <h1>Create your family</h1>
          <p>
            You&apos;re the first user, so you&apos;ll be the family organizer.
            Pick a strong password &mdash; you&apos;ll add the rest of the
            family from inside the app.
          </p>

          <SetupForm />
        </div>
      </div>
      <div className="auth-foot">
        Private to your household &middot; data stays on your server
      </div>
    </div>
  );
}
