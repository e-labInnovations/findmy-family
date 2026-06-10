import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { TabBar } from "./tabbar";

/**
 * Protected layout. Matches the design's responsive shell:
 *   < 900px wide: app content top-to-bottom, tabbar pinned to the
 *                 bottom (horizontal).
 *   ≥ 900px:      tabbar becomes a vertical 84px rail on the left.
 *
 * No global header — each screen owns its own .page-head. Sign out
 * lives on /settings, per the design.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="app-shell">
      <TabBar />
      <main className="app-main">{children}</main>
    </div>
  );
}
