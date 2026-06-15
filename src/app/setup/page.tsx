import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { BrandLogo } from "@/lib/brand-logo";
import { SetupForm } from "./setup-form";

export const dynamic = "force-dynamic";

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
            <BrandLogo size={22} />
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
