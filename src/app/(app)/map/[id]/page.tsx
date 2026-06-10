import Link from "next/link";
import { notFound, forbidden } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth-helpers";
import { colorOklch } from "@/lib/colors";
import { DeviceIcon, deviceTypeLabel } from "@/lib/device-types";
import { bleMacFromAdvKey } from "@/lib/ble-mac";
import { getReportsForAccessory } from "@/lib/apple/get-reports";
import { refreshAccessory, removeAccessory } from "./actions";
import { RotateCw } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AccessoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const me = await requireUser();
  const { id } = await params;

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

  const primary = acc.owners.find((o) => o.isPrimary);

  // Best-effort report fetch. Apple network errors / token expiry shouldn't
  // break the page — show a fallback card and let the user retry.
  let reportsState:
    | { kind: "no-account" }
    | { kind: "none" }
    | { kind: "ok"; lat: number; lng: number; timestamp: number; confidence: number; status: number }
    | { kind: "error"; message: string };
  try {
    const reports = await getReportsForAccessory(acc.id, { days: 7 });
    if (reports === null) reportsState = { kind: "no-account" };
    else if (!reports.latest) reportsState = { kind: "none" };
    else reportsState = { kind: "ok", ...reports.latest };
  } catch (e) {
    reportsState = { kind: "error", message: e instanceof Error ? e.message : "Apple fetch failed" };
  }

  return (
    <>
      <div className="top-bar">
        <Link href="/map" className="back" aria-label="Back">
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
        <h1>Accessory</h1>
        <span className="spacer" />
        <form action={refreshAccessory} style={{ display: "inline-flex" }}>
          <input type="hidden" name="id" value={acc.id} />
          <button
            type="submit"
            className="icon-btn"
            title="Refresh"
            aria-label="Refresh"
          >
            <RotateCw size={18} aria-hidden />
          </button>
        </form>
        {isAdmin && (
          <Link
            href={`/map/${acc.id}/edit`}
            className="icon-btn"
            title="Edit"
            aria-label="Edit"
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
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </Link>
        )}
      </div>

      <div className="screen-body" style={{ gap: 14 }}>
        <div
          className="edit-preview"
          style={{ flexDirection: "column", display: "flex", alignItems: "center" }}
        >
          <span
            className="drow-ico"
            style={{
              background: colorOklch(acc.color),
              width: 76,
              height: 76,
              borderRadius: 22,
            }}
          >
            <DeviceIcon type={acc.type} size={36} />
          </span>
          <h2 style={{ marginTop: 12, fontSize: 22, fontWeight: 650 }}>
            {acc.name}
          </h2>
          <span style={{ color: "var(--text-dim)", fontSize: 14, marginTop: 2 }}>
            {deviceTypeLabel(acc.type)}
          </span>
        </div>

        <LocationCard state={reportsState} isAdmin={isAdmin} />

        <span className="field-label" style={{ padding: "12px 4px 0" }}>
          {acc.owners.length}{" "}
          {acc.owners.length === 1 ? "owner" : "owners"}
        </span>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {acc.owners.map((o) => (
            <div
              key={o.userId}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 12px",
                background: "var(--surface)",
                border: "1px solid var(--border-soft)",
                borderRadius: "var(--radius-md)",
              }}
            >
              <span
                className="avatar sm"
                style={{ background: colorOklch(o.user.color) }}
              >
                {o.user.initials}
              </span>
              <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                <strong style={{ fontSize: 15 }}>{o.user.name}</strong>
                {o.user.title && (
                  <span style={{ fontSize: 12, color: "var(--text-faint)" }}>
                    {o.user.title}
                  </span>
                )}
              </div>
              {o.isPrimary && <span className="badge">Primary</span>}
            </div>
          ))}
        </div>

        {acc.advertisementKey && (
          <Detail
            label="BLE MAC"
            value={bleMacFromAdvKey(acc.advertisementKey) ?? "—"}
            mono
          />
        )}
        <Detail
          label="Hashed adv key"
          value={acc.hashedAdvKey}
          mono
        />
        <Detail
          label="Added"
          value={acc.createdAt.toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        />

        {isAdmin && (
          <form action={removeAccessory} style={{ marginTop: 20 }}>
            <input type="hidden" name="id" value={acc.id} />
            <button type="submit" className="btn danger">
              Delete accessory
            </button>
          </form>
        )}
      </div>
      {primary && null /* placate unused-var on primary; kept for later */}
    </>
  );
}

type LocationState =
  | { kind: "no-account" }
  | { kind: "none" }
  | { kind: "ok"; lat: number; lng: number; timestamp: number; confidence: number; status: number }
  | { kind: "error"; message: string };

function LocationCard({ state, isAdmin }: { state: LocationState; isAdmin: boolean }) {
  const surface = {
    padding: 18,
    background: "var(--surface)",
    border: "1px solid var(--border-soft)",
    borderRadius: "var(--radius-md)",
  } as const;

  if (state.kind === "no-account") {
    return (
      <div style={{ ...surface, textAlign: "center", color: "var(--text-dim)" }}>
        <strong style={{ display: "block", marginBottom: 4 }}>No Apple Account linked</strong>
        <span style={{ fontSize: 13 }}>
          {isAdmin ? (
            <>
              <Link href="/settings/apple" style={{ color: "var(--accent)" }}>
                Link Apple
              </Link>{" "}
              to start seeing locations.
            </>
          ) : (
            "Ask the organizer to link Apple in Settings."
          )}
        </span>
      </div>
    );
  }

  if (state.kind === "none") {
    return (
      <div style={{ ...surface, textAlign: "center", color: "var(--text-dim)" }}>
        <strong style={{ display: "block", marginBottom: 4 }}>No reports in the last 7 days</strong>
        <span style={{ fontSize: 13 }}>
          Make sure the tracker is powered and within Bluetooth range of an iPhone.
        </span>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div style={{ ...surface, textAlign: "center", color: "var(--text-dim)" }}>
        <strong style={{ display: "block", marginBottom: 4 }}>Couldn&apos;t reach Apple</strong>
        <span style={{ fontSize: 13, fontFamily: "var(--font-mono)" }}>{state.message}</span>
      </div>
    );
  }

  const when = new Date(state.timestamp * 1000);
  const ago = relativeTime(when);
  const osmHref = `https://www.openstreetmap.org/?mlat=${state.lat}&mlon=${state.lng}#map=17/${state.lat}/${state.lng}`;

  return (
    <div style={surface}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
        <strong style={{ fontSize: 15 }}>Last seen</strong>
        <span style={{ color: "var(--text-faint)", fontSize: 12 }}>{ago}</span>
      </div>
      <div style={{ fontSize: 13, fontFamily: "var(--font-mono)", color: "var(--text-dim)" }}>
        {state.lat.toFixed(6)}, {state.lng.toFixed(6)}
      </div>
      <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 4 }}>
        confidence {state.confidence} &middot; status 0x{state.status.toString(16).padStart(2, "0")}
        &middot; {when.toLocaleString()}
      </div>
      <a
        href={osmHref}
        target="_blank"
        rel="noopener noreferrer"
        className="btn primary"
        style={{ marginTop: 12, display: "inline-block" }}
      >
        Open in OpenStreetMap
      </a>
    </div>
  );
}

function relativeTime(d: Date): string {
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

function Detail({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 16,
        padding: "12px 16px",
        background: "var(--surface)",
        border: "1px solid var(--border-soft)",
        borderRadius: "var(--radius-md)",
      }}
    >
      <span style={{ color: "var(--text-dim)", fontSize: 14 }}>{label}</span>
      <span
        style={{
          fontSize: 13,
          fontFamily: mono ? "var(--font-mono)" : undefined,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          maxWidth: "60%",
          direction: mono ? "rtl" : "ltr",
          textAlign: mono ? "left" : undefined,
        }}
      >
        {value}
      </span>
    </div>
  );
}
