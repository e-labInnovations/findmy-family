"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Edit3,
  MapPin as MapPinIcon,
  Navigation,
  Route,
  RotateCw,
  Trash2,
  X,
} from "lucide-react";
import MapView from "../map-client";
import type { MapPin, MapTrail } from "../map-view";
import { colorOklch } from "@/lib/colors";
import { DeviceIcon, deviceTypeLabel } from "@/lib/device-types";
import { BatteryIndicator } from "@/lib/battery-display";
import { decodeBattery } from "@/lib/battery";
import { useMyLocation } from "@/lib/use-my-location";
import { ThemeToggle } from "@/lib/theme-toggle";
import { Toast } from "@/lib/toast";

export interface DetailAccessory {
  id: string;
  name: string;
  type: string;
  color: string;
  hashedAdvKey: string;
  bleMac: string | null;
  createdAt: number;
  owners: Array<{
    userId: string;
    isPrimary: boolean;
    name: string;
    initials: string;
    color: string;
    title: string | null;
  }>;
}

export interface DetailReport {
  lat: number;
  lng: number;
  timestamp: number;
  confidence: number;
  status: number;
}

export type ReportsState =
  | { kind: "no-account" }
  | { kind: "none" }
  | { kind: "ok"; latest: DetailReport; trail: DetailReport[] }
  | { kind: "error"; message: string };

type SheetSnap = "peek" | "mid" | "full";

export default function DetailShell({
  accessory,
  reports,
  view,
  isAdmin,
  refreshAction,
  deleteAction,
}: {
  accessory: DetailAccessory;
  reports: ReportsState;
  view: "detail" | "history";
  isAdmin: boolean;
  refreshAction: (formData: FormData) => Promise<void>;
  deleteAction: (formData: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const [snap, setSnap] = useState<SheetSnap>("mid");
  const [isPending, startTransition] = useTransition();
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState<number | null>(null);
  const [historyDays, setHistoryDays] = useState<number | "all">(7);
  const [toast, setToast] = useState<string | null>(null);
  const meState = useMyLocation();
  const me = meState.kind === "ok" ? meState.loc : null;

  // Reset selection when leaving history view.
  useEffect(() => {
    if (view !== "history") setSelectedHistoryIndex(null);
  }, [view]);

  const highlight =
    view === "history" &&
    selectedHistoryIndex !== null &&
    reports.kind === "ok" &&
    reports.trail[selectedHistoryIndex]
      ? {
          accessoryId: accessory.id,
          lat: reports.trail[selectedHistoryIndex].lat,
          lng: reports.trail[selectedHistoryIndex].lng,
        }
      : null;

  const pins: MapPin[] =
    reports.kind === "ok"
      ? [
          {
            accessoryId: accessory.id,
            name: accessory.name,
            type: accessory.type,
            color: accessory.color,
            initials: accessory.name.slice(0, 1).toUpperCase(),
            lat: reports.latest.lat,
            lng: reports.latest.lng,
            timestamp: reports.latest.timestamp,
          },
        ]
      : [];
  const trails: MapTrail[] =
    reports.kind === "ok" && reports.trail.length > 1
      ? [
          {
            accessoryId: accessory.id,
            color: accessory.color,
            points: reports.trail.map((r) => ({ lat: r.lat, lng: r.lng })),
          },
        ]
      : [];

  const startY = useRef<number | null>(null);
  const startSnap = useRef<SheetSnap>("mid");
  function onGripDown(e: React.PointerEvent) {
    startY.current = e.clientY;
    startSnap.current = snap;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onGripMove(e: React.PointerEvent) {
    if (startY.current == null) return;
    const dy = e.clientY - startY.current;
    if (dy < -36) setSnap(startSnap.current === "peek" ? "mid" : "full");
    else if (dy > 36) setSnap(startSnap.current === "full" ? "mid" : "peek");
  }
  function onGripUp(e: React.PointerEvent) {
    startY.current = null;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }
  function onGripClick() {
    setSnap(snap === "peek" ? "full" : "peek");
  }

  return (
    <div className="map-screen">
      <div className="map-layer">
        <MapView
          pins={pins}
          trails={trails}
          activeId={accessory.id}
          me={me}
          highlight={highlight}
        />
      </div>
      <div className="main-overlay">
        <div className="map-top">
          <Link href="/map" className="icon-btn glass" aria-label="Back">
            <ArrowLeft size={18} aria-hidden />
          </Link>
          <div className="spacer" style={{ flex: 1 }} />
          <div className="map-top-btns">
            <ThemeToggle />
            <form
              action={(formData) =>
                startTransition(async () => {
                  try {
                    await refreshAction(formData);
                    setToast("Updated");
                  } catch {
                    setToast("Couldn't reach Apple");
                  }
                })
              }
            >
              <input type="hidden" name="id" value={accessory.id} />
              <button
                type="submit"
                className={`icon-btn glass${isPending ? " spin" : ""}`}
                title="Refresh"
                aria-label="Refresh"
                disabled={isPending}
              >
                <RotateCw size={18} aria-hidden />
              </button>
            </form>
          </div>
        </div>

        <div className={`detail-sheet detail-${snap}`}>
          <div
            className="sheet-grip"
            onClick={onGripClick}
            onPointerDown={onGripDown}
            onPointerMove={onGripMove}
            onPointerUp={onGripUp}
          >
            <span className="grip-bar" />
          </div>
          {view === "history" ? (
            <HistorySheet
              accessory={accessory}
              reports={reports}
              selectedIndex={selectedHistoryIndex}
              onSelectIndex={setSelectedHistoryIndex}
              days={historyDays}
              onDaysChange={setHistoryDays}
              onClose={() => router.push(`/map/${accessory.id}`)}
            />
          ) : (
            <DetailBody
              accessory={accessory}
              reports={reports}
              isAdmin={isAdmin}
              deleteAction={deleteAction}
              onClose={() => router.push("/map")}
            />
          )}
        </div>
      </div>
      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

function DetailBody({
  accessory,
  reports,
  isAdmin,
  deleteAction,
  onClose,
}: {
  accessory: DetailAccessory;
  reports: ReportsState;
  isAdmin: boolean;
  deleteAction: (formData: FormData) => Promise<void>;
  onClose: () => void;
}) {
  const hex = colorOklch(accessory.color);
  const primary = accessory.owners.find((o) => o.isPrimary);
  const others = accessory.owners.filter((o) => !o.isPrimary);

  const statusCls =
    reports.kind === "ok"
      ? withinMinutes(reports.latest.timestamp, 10)
        ? "ok"
        : "neutral"
      : "off";
  const statusLabel =
    reports.kind === "ok"
      ? withinMinutes(reports.latest.timestamp, 10)
        ? "Live"
        : "Offline"
      : reports.kind === "no-account"
        ? "No Apple Account"
        : reports.kind === "error"
          ? "Apple unreachable"
          : "No reports yet";
  const subtext =
    reports.kind === "ok"
      ? relativeAgo(reports.latest.timestamp)
      : reports.kind === "error"
        ? reports.message
        : "";

  return (
    <div className="dd-scroll">
      <div className="dd-head">
        <span className="dd-ico" style={{ background: hex }}>
          <DeviceIcon type={accessory.type} size={30} />
        </span>
        <div className="dd-headtext">
          <h2>{accessory.name}</h2>
          <div className="dd-status">
            <span className={`status-dot ${statusCls}`} />
            {statusLabel}
            {subtext && (
              <>
                <span className="dot-sep">·</span>
                {subtext}
              </>
            )}
            {reports.kind === "ok" && (
              <>
                <span className="dot-sep">·</span>
                <BatteryIndicator statusByte={reports.latest.status} size={16} />
              </>
            )}
          </div>
        </div>
        <button
          type="button"
          className="icon-btn"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={19} aria-hidden />
        </button>
      </div>

      {reports.kind === "ok" && (
        <div className="dd-loc">
          <MapPinIcon size={17} aria-hidden />
          <div className="col">
            <strong>
              {reports.latest.lat.toFixed(6)},{" "}
              {reports.latest.lng.toFixed(6)}
            </strong>
            <span className="faint mono" style={{ fontSize: 12 }}>
              confidence {reports.latest.confidence} · status 0x
              {reports.latest.status.toString(16).padStart(2, "0")}
            </span>
          </div>
        </div>
      )}

      {reports.kind === "no-account" && (
        <div className="dd-loc">
          <MapPinIcon size={17} aria-hidden />
          <div className="col">
            <strong>No Apple Account linked</strong>
            <span className="faint" style={{ fontSize: 12 }}>
              {isAdmin ? (
                <>
                  <Link href="/settings/apple">Link Apple</Link> to start seeing locations.
                </>
              ) : (
                "Ask the organizer to link Apple in Settings."
              )}
            </span>
          </div>
        </div>
      )}

      {(reports.kind === "ok" || isAdmin) && (
        <div className="dd-actions">
          {reports.kind === "ok" && (
            <>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${reports.latest.lat},${reports.latest.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="dd-action accent"
              >
                <span className="dd-action-ico">
                  <Navigation size={18} aria-hidden />
                </span>
                Directions
              </a>
              <Link href={`/map/${accessory.id}?view=history`} className="dd-action">
                <span className="dd-action-ico">
                  <Route size={18} aria-hidden />
                </span>
                History
              </Link>
            </>
          )}
          {isAdmin && (
            <Link href={`/map/${accessory.id}/edit`} className="dd-action">
              <span className="dd-action-ico">
                <Edit3 size={18} aria-hidden />
              </span>
              Edit
            </Link>
          )}
        </div>
      )}

      <div className="dd-card">
        {reports.kind === "ok" && decodeBattery(reports.latest.status) && (
          <div className="dd-stat">
            <span className="muted">Battery</span>
            <BatteryIndicator statusByte={reports.latest.status} withLabel size={20} />
          </div>
        )}
        <div className="dd-stat">
          <span className="muted">Type</span>
          <span>{deviceTypeLabel(accessory.type)}</span>
        </div>
        {accessory.bleMac && (
          <div className="dd-stat">
            <span className="muted">BLE MAC</span>
            <span className="mono" style={{ fontSize: 13 }}>
              {accessory.bleMac}
            </span>
          </div>
        )}
        <div className="dd-stat">
          <span className="muted">Hashed adv key</span>
          <span
            className="mono"
            style={{
              fontSize: 11,
              maxWidth: "55%",
              overflow: "hidden",
              textOverflow: "ellipsis",
              direction: "rtl",
              textAlign: "left",
            }}
          >
            {accessory.hashedAdvKey}
          </span>
        </div>
      </div>

      <div className="dd-section-label">
        {accessory.owners.length === 1 ? "Owner" : "Owners"}
      </div>
      <div className="dd-card">
        {primary && (
          <div className="owner-row">
            <span
              className="avatar sm"
              style={{ background: colorOklch(primary.color) }}
            >
              {primary.initials}
            </span>
            <div className="col">
              <strong>{primary.name}</strong>
              <span className="faint" style={{ fontSize: 12 }}>
                {primary.title ?? "Primary owner"}
              </span>
            </div>
            <span className="badge">Primary</span>
          </div>
        )}
        {others.map((o) => (
          <div className="owner-row" key={o.userId}>
            <span
              className="avatar sm"
              style={{ background: colorOklch(o.color) }}
            >
              {o.initials}
            </span>
            <div className="col">
              <strong>{o.name}</strong>
              <span className="faint" style={{ fontSize: 12 }}>
                {o.title ?? "Can locate"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {isAdmin && (
        <form action={deleteAction} style={{ marginTop: 14 }}>
          <input type="hidden" name="id" value={accessory.id} />
          <button type="submit" className="btn danger">
            <Trash2 size={18} aria-hidden />
            Remove accessory
          </button>
        </form>
      )}
    </div>
  );
}

const DAY_OPTIONS: Array<{ value: number | "all"; label: string }> = [
  { value: 1, label: "24h" },
  { value: 3, label: "3d" },
  { value: 7, label: "7d" },
  { value: 14, label: "14d" },
  { value: 30, label: "30d" },
  { value: "all", label: "All" },
];

function HistorySheet({
  accessory,
  reports,
  selectedIndex,
  onSelectIndex,
  days,
  onDaysChange,
  onClose,
}: {
  accessory: DetailAccessory;
  reports: ReportsState;
  selectedIndex: number | null;
  onSelectIndex: (i: number | null) => void;
  days: number | "all";
  onDaysChange: (d: number | "all") => void;
  onClose: () => void;
}) {
  const hex = colorOklch(accessory.color);
  const allItems = reports.kind === "ok" ? reports.trail : [];
  const items =
    days === "all"
      ? allItems
      : allItems.filter(
          (h) => Date.now() / 1000 - h.timestamp <= days * 86400,
        );
  return (
    <>
      <div className="hist-head">
        <span className="dd-ico sm" style={{ background: hex }}>
          <Route size={18} aria-hidden />
        </span>
        <div className="col" style={{ flex: 1 }}>
          <strong>Location history</strong>
          <span className="faint" style={{ fontSize: 13 }}>
            {accessory.name} · {items.length} report{items.length === 1 ? "" : "s"}
          </span>
        </div>
        <button
          type="button"
          className="icon-btn"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={19} aria-hidden />
        </button>
      </div>
      <div className="day-chips">
        {DAY_OPTIONS.map((opt) => (
          <button
            type="button"
            key={String(opt.value)}
            className={`day-chip${days === opt.value ? " on" : ""}`}
            onClick={() => {
              onDaysChange(opt.value);
              onSelectIndex(null);
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div className="dd-scroll">
        <div className="hist-wrap">
          {items.length === 0 ? (
            <div className="empty-min">
              {allItems.length === 0
                ? "No history yet."
                : `No reports in the last ${days === "all" ? "selected range" : `${days}d`}.`}
            </div>
          ) : (
            items.map((h, i) => {
              const isActive = i === selectedIndex;
              const dotColor = isActive || i === 0 ? hex : "var(--surface-3)";
              const borderColor = isActive || i === 0 ? hex : "var(--border)";
              return (
              <button
                type="button"
                className={`hist-item${isActive ? " active" : ""}`}
                key={`${h.timestamp}-${i}`}
                onClick={() => onSelectIndex(isActive ? null : i)}
              >
                <div className="hist-rail">
                  <span
                    className="hist-dot"
                    style={{ background: dotColor, borderColor }}
                  />
                  {i < items.length - 1 && <span className="hist-line" />}
                </div>
                <div className="hist-body">
                  <div className="hist-top">
                    <strong>{shortTime(h.timestamp)}</strong>
                    {i === 0 && <span className="badge">Now</span>}
                  </div>
                  <span className="faint" style={{ fontSize: 13 }}>
                    {relativeAgo(h.timestamp)}
                  </span>
                  <span
                    className="faint mono"
                    style={{ fontSize: 11 }}
                  >
                    {h.lat.toFixed(4)}, {h.lng.toFixed(4)}
                  </span>
                </div>
              </button>
              );
            })
          )}
        </div>
      </div>
    </>
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

function shortTime(secondsSinceEpoch: number): string {
  // "2-digit" for hour so single-digit hours pad to two — keeps the
  // timeline times left-aligned without ragged colons.
  return new Date(secondsSinceEpoch * 1000).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function withinMinutes(secondsSinceEpoch: number, minutes: number): boolean {
  return Date.now() / 1000 - secondsSinceEpoch < minutes * 60;
}
