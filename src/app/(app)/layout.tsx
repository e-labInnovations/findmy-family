import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { TabBar } from "./tabbar";

/**
 * Protected layout. Wraps every page under /(app) with a top bar
 * (identity + sign out) and a tabbar (Accessories / People / Settings).
 * The tabbar lives in a client component so it can read the current
 * pathname and highlight the active tab.
 *
 * Eventually this gets replaced with the persistent-map shell from
 * the design, but the same auth gating + sign-out hook stay.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg)",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "12px 18px",
          borderBottom: "1px solid var(--border-soft)",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <strong style={{ letterSpacing: "-0.01em", fontSize: 18 }}>
            FindMy
          </strong>
          <span style={{ color: "var(--accent)", fontWeight: 700, fontSize: 18 }}>
            Family
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13, color: "var(--text-dim)" }}>
            {session.user.name}
          </span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="icon-btn"
              style={{ width: 36, height: 36 }}
              title="Sign out"
              aria-label="Sign out"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" x2="9" y1="12" y2="12" />
              </svg>
            </button>
          </form>
        </div>
      </header>

      <main style={{ flex: 1, overflowY: "auto" }}>{children}</main>

      <TabBar />
    </div>
  );
}
