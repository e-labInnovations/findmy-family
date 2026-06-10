import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth-helpers";
import { colorOklch } from "@/lib/colors";
import { DeviceIcon, deviceTypeLabel } from "@/lib/device-types";
import { fetchAndIngest } from "@/lib/apple/get-reports";

export const dynamic = "force-dynamic";

/**
 * Accessories list. Until the real map view lands, this is the home
 * of Accessory CRUD.
 *
 * Visibility:
 *   ADMIN  sees every accessory
 *   MEMBER sees only accessories they own
 */
export default async function MapPage() {
  const me = await requireUser();
  const isAdmin = me.role === "ADMIN";

  const accessories = await db.accessory.findMany({
    where: isAdmin ? undefined : { owners: { some: { userId: me.id } } },
    orderBy: { name: "asc" },
    include: {
      owners: {
        include: {
          user: {
            select: { id: true, name: true, initials: true, color: true },
          },
        },
      },
    },
  });

  // Bulk-ingest fresh reports for everything on screen in a single Apple
  // call, then index the latest report per accessory for the list row.
  // Failures (Apple down, tokens expired) shouldn't break the list — we
  // just fall back to whatever's already persisted.
  let latestByAccessory = new Map<
    string,
    { lat: number; lng: number; timestamp: number }
  >();
  try {
    const reports = await fetchAndIngest(accessories.map((a) => a.id));
    if (reports) {
      latestByAccessory = new Map(
        reports
          .filter((r) => r.latest !== null)
          .map((r) => [
            r.accessoryId,
            {
              lat: r.latest!.lat,
              lng: r.latest!.lng,
              timestamp: r.latest!.timestamp,
            },
          ]),
      );
    }
  } catch (e) {
    console.error("map: bulk ingest failed —", e);
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-h1">Accessories</h1>
          <span className="page-sub">
            {accessories.length}{" "}
            {accessories.length === 1 ? "accessory" : "accessories"}
          </span>
        </div>
        {isAdmin && (
          <Link
            href="/map/new"
            className="icon-btn accent"
            title="Add accessory"
            aria-label="Add accessory"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </Link>
        )}
      </div>

      <div className="screen-body">
        {accessories.length === 0 ? (
          <div className="empty-min">
            No accessories yet.{" "}
            {isAdmin ? "Tap + to add one." : "Ask your family organizer."}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {accessories.map((a) => {
              const primary = a.owners.find((o) => o.isPrimary)?.user;
              return (
                <Link key={a.id} href={`/map/${a.id}`} className="drow">
                  <span
                    className="drow-ico"
                    style={{ background: colorOklch(a.color) }}
                  >
                    <DeviceIcon type={a.type} size={20} />
                  </span>
                  <div className="drow-main">
                    <span className="drow-name">{a.name}</span>
                    <span className="drow-sub">
                      {deviceTypeLabel(a.type)}
                      {primary && (
                        <>
                          {" · "}
                          <span style={{ color: "var(--text-faint)" }}>
                            {primary.name}
                          </span>
                        </>
                      )}
                      {latestByAccessory.has(a.id) && (
                        <>
                          {" · "}
                          <span style={{ color: "var(--accent)" }}>
                            {relativeAgo(latestByAccessory.get(a.id)!.timestamp)}
                          </span>
                        </>
                      )}
                    </span>
                  </div>
                  <svg
                    className="drow-chev"
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
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

function relativeAgo(secondsSinceEpoch: number): string {
  const sec = Math.floor(Date.now() / 1000 - secondsSinceEpoch);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}
