import Link from "next/link";
import { AlertTriangle } from "lucide-react";

/**
 * Renders when Apple's searchPartyToken has been rejected (we caught a
 * 401/403 from /acsnservice/fetch and set AppleAccount.expiresAt to
 * epoch). Admins get a re-link CTA; members get a softer "ask your
 * organizer" message.
 *
 * Caller decides when to mount this — typically gated on
 * `appleAccountExpired && (isAdmin || isMember)` from the server page.
 */
export function ReLinkBanner({ isAdmin }: { isAdmin: boolean }) {
  return (
    <div className="relink-banner">
      <span className="relink-banner-ico">
        <AlertTriangle size={18} aria-hidden />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <strong style={{ display: "block" }}>Apple Account expired</strong>
        <span style={{ fontSize: 13, color: "var(--text-dim)" }}>
          {isAdmin
            ? "Re-link to keep locations updating."
            : "Ask your organizer to re-link Apple in Settings."}
        </span>
      </div>
      {isAdmin && (
        <Link href="/settings/apple" className="btn primary" style={{ width: "auto", height: 36 }}>
          Re-link
        </Link>
      )}
    </div>
  );
}
