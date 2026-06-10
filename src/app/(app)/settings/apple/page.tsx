import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { requireAdmin } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import AppleLinkForm from "./apple-link-form";

export const dynamic = "force-dynamic";

const STATE_COOKIE = "fmf_apple_link";

export default async function AppleLinkPage() {
  await requireAdmin();
  const existing = await db.appleAccount.findUnique({ where: { id: "singleton" } });
  if (existing) redirect("/settings");

  const jar = await cookies();
  const has2fa = Boolean(jar.get(STATE_COOKIE)?.value);

  return (
    <>
      <div className="top-bar">
        <Link href="/settings" className="back" aria-label="Back">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <h1>Link Apple Account</h1>
        <span className="spacer" />
      </div>

      <div className="screen-body" style={{ gap: 16 }}>
        <p style={{ color: "var(--text-dim)", fontSize: 14, padding: "0 4px" }}>
          One Apple ID powers location services for everyone in this family
          app. Only the organizer links it.
        </p>
        <AppleLinkForm initialStep={has2fa ? "2fa" : "creds"} />
      </div>
    </>
  );
}
