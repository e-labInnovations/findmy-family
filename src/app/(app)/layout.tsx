import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";

/**
 * Protected layout. Shows a thin top bar with the user's identity
 * and a tabbar at the bottom. Replaced later by the persistent-map
 * shell from the design.
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
          padding: "14px 18px",
          borderBottom: "1px solid var(--border-soft)",
        }}
      >
        <strong style={{ letterSpacing: "-0.01em" }}>FindMy Family</strong>
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
            ⎋
          </button>
        </form>
      </header>

      <main style={{ flex: 1, padding: 24 }}>{children}</main>

      <nav
        style={{
          display: "flex",
          borderTop: "1px solid var(--border-soft)",
          background: "var(--surface)",
          padding: "8px 0",
        }}
      >
        {[
          { href: "/map", label: "Accessories" },
          { href: "/people", label: "People" },
          { href: "/settings", label: "Settings" },
        ].map((it) => (
          <Link
            key={it.href}
            href={it.href}
            style={{
              flex: 1,
              textAlign: "center",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-dim)",
              padding: "10px 0",
              textDecoration: "none",
            }}
          >
            {it.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
