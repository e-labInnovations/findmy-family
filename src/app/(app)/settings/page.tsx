import Link from "next/link";
import { Info, LogOut } from "lucide-react";
import { signOut } from "@/auth";
import { requireUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { colorOklch } from "@/lib/colors";
import { AppleIcon } from "@/lib/custom-icons";
import { unlinkAppleAccount } from "./apple/actions";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const me = await requireUser();
  const user = await db.user.findUnique({ where: { id: me.id } });
  if (!user) {
    // Account was deleted out from under the session — sign out cleanly.
    return (
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      >
        <button type="submit">Sign out</button>
      </form>
    );
  }

  const isAdmin = user.role === "ADMIN";
  const appleAccount = isAdmin
    ? await db.appleAccount.findUnique({ where: { id: "singleton" } })
    : null;

  return (
    <>
      <div className="page-head">
        <h1 className="page-h1">Settings</h1>
      </div>

      <div className="set-profile">
        <span
          className="avatar"
          style={{ background: colorOklch(user.color) }}
        >
          {user.initials}
        </span>
        <div className="col">
          <strong>{user.name}</strong>
          <span
            className="faint"
            style={{
              fontSize: 12,
              fontFamily: "var(--font-mono)",
            }}
          >
            {user.email}
          </span>
        </div>
        {isAdmin && <span className="badge">Organizer</span>}
      </div>

      {isAdmin && (
        <>
          <div className="set-section-label">Apple Account &middot; Whole App</div>
          <div className="set-group">
            {appleAccount ? (
              <div className="set-row" style={{ cursor: "default" }}>
                <span className="set-ico">
                  <AppleIcon size={18} />
                </span>
                <div className="col">
                  <span className="set-label">{appleAccount.appleId}</span>
                  <span className="faint" style={{ fontSize: 12 }}>
                    Linked &middot; tokens expire{" "}
                    {appleAccount.expiresAt.toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </div>
            ) : (
              <Link href="/settings/apple" className="set-row">
                <span className="set-ico">
                  <AppleIcon size={18} />
                </span>
                <div className="col">
                  <span className="set-label">Link Apple Account</span>
                  <span className="faint" style={{ fontSize: 12 }}>
                    Sign in once for the whole family
                  </span>
                </div>
              </Link>
            )}
          </div>
          {appleAccount && (
            <div style={{ padding: "12px 14px 0" }}>
              <form action={unlinkAppleAccount}>
                <button type="submit" className="btn danger">
                  Unlink Apple Account
                </button>
              </form>
            </div>
          )}
          <p
            className="field-help"
            style={{ padding: "12px 18px 0", color: "var(--text-faint)" }}
          >
            One shared Apple Account powers location services for the entire
            family app. Members sign in with their own family email &mdash;
            only the organizer links Apple here.
          </p>
        </>
      )}

      <div className="set-section-label">About</div>
      <div className="set-group">
        <button type="button" className="set-row" disabled>
          <span className="set-ico">
            <Info size={18} aria-hidden />
          </span>
          <div className="col">
            <span className="set-label">FindMy Family</span>
            <span className="faint" style={{ fontSize: 12 }}>
              v0.1 &middot; self-hosted
            </span>
          </div>
        </button>
      </div>

      <div style={{ padding: "24px 14px 32px" }}>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button type="submit" className="btn signout">
            <LogOut size={18} aria-hidden />
            Sign out
          </button>
        </form>
      </div>
    </>
  );
}

