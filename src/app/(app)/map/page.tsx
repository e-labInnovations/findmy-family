import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth-helpers";
import { fetchAndIngest } from "@/lib/apple/get-reports";
import MapShell, { type AccessoryListItem } from "./map-shell";
import type { MapPin } from "./map-view";
import { refreshAllVisible } from "./actions";

export const dynamic = "force-dynamic";

/**
 * Family-scoped tracker dashboard.
 *
 * Visibility:
 *   ADMIN  sees every accessory
 *   MEMBER sees only accessories they own
 *
 * On every visit we bulk-ingest fresh Apple reports in one round-trip
 * and persist into LocationReport (idempotent). Apple downtime / token
 * expiry degrades silently to whatever is already cached locally.
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
          user: { select: { id: true, name: true, initials: true, color: true } },
        },
      },
    },
  });

  let latestByAccessory = new Map<
    string,
    { lat: number; lng: number; timestamp: number; status: number }
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
              status: r.latest!.status,
            },
          ]),
      );
    }
  } catch (e) {
    console.error("map: bulk ingest failed —", e);
  }

  const pins: MapPin[] = accessories
    .map((a) => {
      const loc = latestByAccessory.get(a.id);
      if (!loc) return null;
      return {
        accessoryId: a.id,
        name: a.name,
        type: a.type,
        color: a.color,
        initials: a.name.slice(0, 1).toUpperCase(),
        lat: loc.lat,
        lng: loc.lng,
        timestamp: loc.timestamp,
      };
    })
    .filter((p): p is MapPin => p !== null);

  const list: AccessoryListItem[] = accessories.map((a) => {
    const primary = a.owners.find((o) => o.isPrimary)?.user;
    return {
      id: a.id,
      name: a.name,
      type: a.type,
      color: a.color,
      primary: primary
        ? { name: primary.name, initials: primary.initials, color: primary.color }
        : null,
      latest: latestByAccessory.get(a.id) ?? null,
    };
  });

  return (
    <MapShell
      pins={pins}
      accessories={list}
      isAdmin={isAdmin}
      familyName="My Family"
      refreshAction={refreshAllVisible}
    />
  );
}
