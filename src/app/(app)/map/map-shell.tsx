"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Crosshair,
  Plus,
  RotateCw,
  Search,
  Users,
  X,
} from "lucide-react";
import MapView from "./map-client";
import type { MapPin } from "./map-view";
import { colorOklch } from "@/lib/colors";
import { DeviceIcon, deviceTypeLabel } from "@/lib/device-types";
import { BatteryIndicator } from "@/lib/battery-display";
import { useMyLocation } from "@/lib/use-my-location";
import { ThemeToggle } from "@/lib/theme-toggle";
import { Toast } from "@/lib/toast";
import { ReLinkBanner } from "@/lib/relink-banner";

export interface AccessoryListItem {
  id: string;
  name: string;
  type: string;
  color: string;
  primary: { name: string; initials: string; color: string } | null;
  latest: {
    lat: number;
    lng: number;
    timestamp: number;
    status: number;
    place: string | null;
  } | null;
}

type SheetSnap = "peek" | "half" | "full";

/**
 * Map screen shell. Renders the full-bleed map and a bottom sheet (mobile)
 * / left side panel (≥900px) with search + accessory list. Sheet is
 * drag-to-snap on touch / pointer; click on grip toggles peek<->half.
 *
 * Sharing-aware: refresh and add buttons are passed in as server actions
 * via formAction props (admins only see Add).
 */
export default function MapShell({
  pins,
  accessories,
  isAdmin,
  familyName,
  refreshAction,
  appleAccountExpired,
}: {
  pins: MapPin[];
  accessories: AccessoryListItem[];
  isAdmin: boolean;
  familyName: string;
  refreshAction: () => Promise<void>;
  appleAccountExpired: boolean;
}) {
  const [snap, setSnap] = useState<SheetSnap>("half");
  const [q, setQ] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [fitToken, setFitToken] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const meState = useMyLocation();
  const me = meState.kind === "ok" ? meState.loc : null;

  // Surface non-ok states so the user knows *why* the blue dot is absent.
  useEffect(() => {
    if (meState.kind !== "ok" && meState.kind !== "loading") {
      console.warn("[geolocation]", meState);
    }
  }, [meState]);

  const filtered = q
    ? accessories.filter((a) =>
        `${a.name} ${a.primary?.name ?? ""}`.toLowerCase().includes(q.toLowerCase()),
      )
    : accessories;
  const visiblePins = q
    ? pins.filter((p) => filtered.some((a) => a.id === p.accessoryId))
    : pins;

  const startY = useRef<number | null>(null);
  const startSnap = useRef<SheetSnap>("half");
  function onGripDown(e: React.PointerEvent) {
    startY.current = e.clientY;
    startSnap.current = snap;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onGripMove(e: React.PointerEvent) {
    if (startY.current == null) return;
    const dy = e.clientY - startY.current;
    if (dy < -40) setSnap(startSnap.current === "peek" ? "half" : "full");
    else if (dy > 40) setSnap(startSnap.current === "full" ? "half" : "peek");
  }
  function onGripUp(e: React.PointerEvent) {
    startY.current = null;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }
  function onGripClick() {
    setSnap(snap === "peek" ? "half" : snap === "half" ? "full" : "peek");
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await refreshAction();
      setToast("Updated");
    } catch {
      setToast("Couldn't reach Apple");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="map-screen">
      <div className="map-layer">
        <MapView pins={visiblePins} me={me} fitToken={fitToken} />
      </div>
      <div className="main-overlay">
        {appleAccountExpired && <ReLinkBanner isAdmin={isAdmin} />}
        <div className="map-top">
          <div className="map-title">
            <div className="mt-logo">
              <Users size={18} aria-hidden />
            </div>
            <div
              className="col"
              style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}
            >
              <strong>{familyName}</strong>
              <span className="faint" style={{ fontSize: 12 }}>
                {accessories.length}{" "}
                {accessories.length === 1 ? "accessory" : "accessories"}
              </span>
            </div>
          </div>
          <div className="map-top-btns">
            <button
              type="button"
              className={`icon-btn glass${refreshing ? " spin" : ""}`}
              onClick={handleRefresh}
              title="Refresh"
              aria-label="Refresh"
              disabled={refreshing}
            >
              <RotateCw size={18} aria-hidden />
            </button>
            <button
              type="button"
              className="icon-btn glass"
              onClick={() => setFitToken((t) => t + 1)}
              title="Fit all"
              aria-label="Fit all"
            >
              <Crosshair size={18} aria-hidden />
            </button>
            <ThemeToggle />
          </div>
        </div>

        <div className={`sheet sheet-${snap}`}>
          <div
            className="sheet-grip"
            onClick={onGripClick}
            onPointerDown={onGripDown}
            onPointerMove={onGripMove}
            onPointerUp={onGripUp}
          >
            <span className="grip-bar" />
          </div>
          <div className="sheet-head">
            <div className="search">
              <Search size={18} aria-hidden />
              <input
                value={q}
                placeholder="Search accessories & people"
                onChange={(e) => setQ(e.target.value)}
                onFocus={() => snap === "peek" && setSnap("half")}
              />
              {q && (
                <button
                  type="button"
                  className="search-clear"
                  onClick={() => setQ("")}
                  aria-label="Clear search"
                >
                  <X size={14} aria-hidden />
                </button>
              )}
            </div>
            {isAdmin && (
              <Link
                href="/map/new"
                className="icon-btn accent"
                title="Add accessory"
                aria-label="Add accessory"
              >
                <Plus size={20} aria-hidden />
              </Link>
            )}
          </div>
          <div className="sheet-body">
            <div className="sheet-section-label">All accessories</div>
            {filtered.length === 0 ? (
              <div className="empty-min">
                {q
                  ? `No matches for "${q}"`
                  : isAdmin
                    ? "No accessories yet. Tap + to add one."
                    : "Ask your family organizer to add accessories."}
              </div>
            ) : (
              filtered.map((a) => (
                <DeviceRow key={a.id} a={a} />
              ))
            )}
          </div>
        </div>
      </div>
      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

function DeviceRow({ a }: { a: AccessoryListItem }) {
  const hex = colorOklch(a.color);
  return (
    <Link href={`/map/${a.id}`} className="drow">
      <span className="drow-ico" style={{ background: hex }}>
        <DeviceIcon type={a.type} size={20} />
      </span>
      <div className="drow-main">
        <div className="drow-top">
          <span className="drow-name ellipsis">{a.name}</span>
          <span
            className={
              a.latest ? "status-dot ok" : "status-dot off"
            }
          />
        </div>
        <span className="drow-sub ellipsis">
          {a.latest?.place ? (
            <>{a.latest.place}</>
          ) : (
            <>{deviceTypeLabel(a.type)}</>
          )}
          {a.primary && (
            <>
              <span className="dot-sep">·</span>
              <span style={{ color: "var(--text-faint)" }}>
                {a.primary.name}
              </span>
            </>
          )}
          {a.latest && (
            <>
              <span className="dot-sep">·</span>
              <span style={{ color: "var(--accent)" }}>
                {relativeAgo(a.latest.timestamp)}
              </span>
            </>
          )}
        </span>
      </div>
      <div className="drow-end">
        {a.latest && <BatteryIndicator statusByte={a.latest.status} />}
        <ArrowLeft size={16} aria-hidden style={{ transform: "rotate(180deg)" }} />
      </div>
    </Link>
  );
}

function relativeAgo(secondsSinceEpoch: number): string {
  const s = Math.floor(Date.now() / 1000 - secondsSinceEpoch);
  if (s < 60) return "Just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr${h === 1 ? "" : "s"} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}
