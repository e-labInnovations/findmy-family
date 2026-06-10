import { signOut } from "@/auth";
import { requireUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { colorOklch } from "@/lib/colors";

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
            <button type="button" className="set-row" disabled>
              <span className="set-ico">
                <Icon name="apple" />
              </span>
              <div className="col">
                <span className="set-label">Link Apple Account</span>
                <span className="faint" style={{ fontSize: 12 }}>
                  Coming soon &mdash; needs the GSA SRP port
                </span>
              </div>
            </button>
          </div>
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
            <Icon name="info" />
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
            <Icon name="logout" />
            Sign out
          </button>
        </form>
      </div>
    </>
  );
}

function Icon({ name }: { name: "apple" | "info" | "logout" }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };
  if (name === "apple") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" {...common}>
        <path d="M19 7.5a4.5 4.5 0 0 1-1.7 3.5 4.6 4.6 0 0 1 1.8 3.7c0 4-3.5 6.5-7.3 6.5a8 8 0 0 1-3.4-.8 4.2 4.2 0 0 0-3.4 0c-.7.4-1.2.4-1.5 0-1-1.3-1.5-3.8-1.5-6.2 0-3 1.4-6 4-6 1 0 1.8.3 2.5.7.7-.4 1.5-.7 2.5-.7 1 0 1.8.3 2.5.7C13.1 8.4 14 8 15 8a4 4 0 0 1 4-.5z" />
        <path d="M14 3c-.5 1-1.5 2-3 2" />
      </svg>
    );
  }
  if (name === "info") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" {...common}>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4M12 8h.01" />
      </svg>
    );
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" {...common}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </svg>
  );
}
