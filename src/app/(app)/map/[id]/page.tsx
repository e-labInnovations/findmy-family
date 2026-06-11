import { notFound, forbidden } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth-helpers";
import { bleMacFromAdvKey } from "@/lib/ble-mac";
import { getReportsForAccessory } from "@/lib/apple/get-reports";
import DetailShell, {
  type DetailAccessory,
  type ReportsState,
} from "./detail-shell";
import { refreshAccessory, removeAccessory } from "./actions";

export const dynamic = "force-dynamic";

// Cap trail length sent to the client. Beyond ~200 the polyline is
// unreadable and the page payload bloats.
const TRAIL_MAX_POINTS = 200;

export default async function AccessoryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const me = await requireUser();
  const { id } = await params;
  const { view: viewParam } = await searchParams;
  const view = viewParam === "history" ? "history" : "detail";

  const appleAccount = await db.appleAccount.findUnique({
    where: { id: "singleton" },
    select: { expiresAt: true },
  });
  const appleAccountExpired = !!(
    appleAccount && appleAccount.expiresAt.getTime() < Date.now()
  );

  const acc = await db.accessory.findUnique({
    where: { id },
    include: {
      owners: {
        include: {
          user: {
            select: { id: true, name: true, color: true, initials: true, title: true },
          },
        },
      },
    },
  });
  if (!acc) notFound();

  const isAdmin = me.role === "ADMIN";
  const isOwner = acc.owners.some((o) => o.userId === me.id);
  if (!isAdmin && !isOwner) forbidden();

  let reports: ReportsState;
  try {
    const r = await getReportsForAccessory(acc.id, { days: 7 });
    if (r === null) reports = { kind: "no-account" };
    else if (!r.latest) reports = { kind: "none" };
    else {
      reports = {
        kind: "ok",
        latest: {
          lat: r.latest.lat,
          lng: r.latest.lng,
          timestamp: r.latest.timestamp,
          confidence: r.latest.confidence,
          status: r.latest.status,
          place: r.latest.place ?? null,
        },
        trail: r.all.slice(0, TRAIL_MAX_POINTS).map((p) => ({
          lat: p.lat,
          lng: p.lng,
          timestamp: p.timestamp,
          confidence: p.confidence,
          status: p.status,
          place: p.place ?? null,
        })),
      };
    }
  } catch (e) {
    reports = {
      kind: "error",
      message: e instanceof Error ? e.message : "Apple fetch failed",
    };
  }

  const detail: DetailAccessory = {
    id: acc.id,
    name: acc.name,
    type: acc.type,
    color: acc.color,
    hashedAdvKey: acc.hashedAdvKey,
    bleMac: acc.advertisementKey ? bleMacFromAdvKey(acc.advertisementKey) : null,
    createdAt: acc.createdAt.getTime(),
    owners: acc.owners.map((o) => ({
      userId: o.userId,
      isPrimary: o.isPrimary,
      name: o.user.name,
      initials: o.user.initials,
      color: o.user.color,
      title: o.user.title,
    })),
  };

  return (
    <DetailShell
      accessory={detail}
      reports={reports}
      view={view}
      isAdmin={isAdmin}
      refreshAction={refreshAccessory}
      deleteAction={removeAccessory}
      appleAccountExpired={appleAccountExpired}
    />
  );
}
