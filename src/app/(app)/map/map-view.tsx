"use client";

import { useEffect, useMemo, useRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CircleMarker,
  MapContainer,
  Polyline,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { colorOklch } from "@/lib/colors";
import { DeviceIcon } from "@/lib/device-types";

export interface MapPin {
  accessoryId: string;
  name: string;
  type: string;
  color: string;
  initials: string;
  lat: number;
  lng: number;
  /** Seconds since epoch — surfaced in the popup. */
  timestamp: number;
}

export interface MapTrail {
  accessoryId: string;
  color: string;
  /** Newest-first array of (lat, lng) pairs. */
  points: Array<{ lat: number; lng: number }>;
}

export interface MeLocation {
  lat: number;
  lng: number;
}

/**
 * Leaflet map with custom HTML pins (matches the FindMy Family design).
 *
 * Each pin is a divIcon with three layers — a colored .pin-dot containing
 * the device icon, a .pin-tail "drop", and a .ring that pulses when
 * activeId matches the pin. Optional `me` shows the user's current
 * device as a pulsing blue dot. Styling lives in globals.css.
 *
 * SSR-incompatible (Leaflet touches `window` at import time). Server pages
 * import this via the map-client.tsx wrapper, which is "use client" +
 * `next/dynamic({ ssr: false })`.
 */
export interface HighlightedPoint {
  accessoryId: string;
  lat: number;
  lng: number;
}

export default function MapView({
  pins,
  trails,
  activeId,
  me,
  fitToken,
  highlight,
  height = "100%",
}: {
  pins: MapPin[];
  trails?: MapTrail[];
  activeId?: string;
  me?: MeLocation | null;
  /** Bump to force a fit-bounds re-run (e.g. when user taps "Fit all"). */
  fitToken?: number;
  /** A specific waypoint to spotlight (e.g. selected history item). */
  highlight?: HighlightedPoint | null;
  height?: number | string;
}) {
  const initial = useMemo(() => {
    if (pins.length === 0) return { center: [20, 78] as [number, number], zoom: 4 };
    return { center: [pins[0].lat, pins[0].lng] as [number, number], zoom: 16 };
  }, [pins]);

  return (
    <MapContainer
      center={initial.center}
      zoom={initial.zoom}
      style={{ width: "100%", height }}
      scrollWheelZoom
      zoomControl={false}
      attributionControl
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      <FitBounds
        pins={pins}
        activeId={activeId}
        me={me ?? null}
        fitToken={fitToken}
      />

      {trails?.map((t) => (
        <GradientTrail key={`trail-${t.accessoryId}`} trail={t} />
      ))}

      <DivIconLayer pins={pins} activeId={activeId} />
      {highlight && <HighlightMarker point={highlight} />}
      {me && <MeLayer me={me} />}
    </MapContainer>
  );
}

/**
 * Trail rendered as N segments with opacity fading from oldest (faded)
 * to newest (full). Conveys direction without arrowheads — the brighter
 * end is "now". Input points are newest-first; we reverse for segment
 * iteration so segment[i] runs from older → newer.
 */
function GradientTrail({ trail }: { trail: MapTrail }) {
  const segments = useMemo(() => {
    const pts = [...trail.points].reverse();
    const out: Array<{ a: [number, number]; b: [number, number]; opacity: number }> = [];
    for (let i = 0; i < pts.length - 1; i++) {
      // 0.15 (oldest) → 0.85 (newest)
      const opacity = 0.15 + (0.7 * (i + 1)) / pts.length;
      out.push({
        a: [pts[i].lat, pts[i].lng],
        b: [pts[i + 1].lat, pts[i + 1].lng],
        opacity,
      });
    }
    return out;
  }, [trail.points]);

  const color = colorOklch(trail.color);
  return (
    <>
      {segments.map((s, i) => (
        <Polyline
          key={i}
          positions={[s.a, s.b]}
          pathOptions={{
            color,
            weight: 4,
            opacity: s.opacity,
            dashArray: "1 9",
            lineCap: "round",
          }}
        />
      ))}
    </>
  );
}

/**
 * Spotlight marker used when a history-list item is selected. Larger
 * than the trail's dotted waypoints + ringed in white so it stands out.
 * Flies the map to it on change.
 */
function HighlightMarker({ point }: { point: HighlightedPoint }) {
  const map = useMap();
  useEffect(() => {
    flyToVisible(map, [point.lat, point.lng], 17);
  }, [point.lat, point.lng, map]);

  return (
    <CircleMarker
      center={[point.lat, point.lng]}
      radius={9}
      pathOptions={{
        color: "#fff",
        weight: 3,
        fillColor: "#0a64f5",
        fillOpacity: 1,
      }}
    />
  );
}

/**
 * Pulsing blue dot showing the user's current device location.
 * Styling: .me-pin > .me-halo + .me-dot (defined in globals.css).
 */
function MeLayer({ me }: { me: MeLocation }) {
  const map = useMap();
  const ref = useRef<L.Marker | null>(null);

  useEffect(() => {
    const html = `<div class="me-pin"><span class="me-halo"></span><span class="me-dot"></span></div>`;
    const icon = L.divIcon({
      html,
      className: "me-wrap",
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });
    if (ref.current) {
      ref.current.setLatLng([me.lat, me.lng]);
      ref.current.setIcon(icon);
    } else {
      const marker = L.marker([me.lat, me.lng], {
        icon,
        zIndexOffset: 1500,
        keyboard: false,
        interactive: false,
      });
      marker.addTo(map);
      ref.current = marker;
    }
  }, [me, map]);

  useEffect(() => {
    return () => {
      if (ref.current) {
        map.removeLayer(ref.current);
        ref.current = null;
      }
    };
  }, [map]);

  return null;
}

/**
 * Renders one divIcon marker per pin. We do this outside react-leaflet's
 * declarative <Marker> so we can control the inner HTML directly (the
 * design wants a 3-layer pin that React.createElement-ing to innerHTML
 * via L.divIcon handles more cleanly than wrapping a React tree).
 */
function DivIconLayer({ pins, activeId }: { pins: MapPin[]; activeId?: string }) {
  const map = useMap();
  const markersRef = useRef<Record<string, L.Marker>>({});

  useEffect(() => {
    const live = new Set<string>();
    for (const pin of pins) {
      live.add(pin.accessoryId);
      const active = pin.accessoryId === activeId;
      const icon = L.divIcon({
        html: pinHTML(pin, active),
        className: "pin-wrap",
        iconSize: [38, 46],
        iconAnchor: [19, 44],
      });
      const existing = markersRef.current[pin.accessoryId];
      if (existing) {
        existing.setLatLng([pin.lat, pin.lng]);
        existing.setIcon(icon);
        existing.setZIndexOffset(active ? 1000 : 0);
      } else {
        const marker = L.marker([pin.lat, pin.lng], {
          icon,
          riseOnHover: true,
          zIndexOffset: active ? 1000 : 0,
        });
        marker.on("click", () => {
          // Navigate to /map/[id] via plain anchor — simpler than threading
          // a router prop through, and matches the popup's intent.
          window.location.href = `/map/${pin.accessoryId}`;
        });
        marker.addTo(map);
        markersRef.current[pin.accessoryId] = marker;
      }
    }
    // Sweep removed pins.
    for (const id of Object.keys(markersRef.current)) {
      if (!live.has(id)) {
        map.removeLayer(markersRef.current[id]);
        delete markersRef.current[id];
      }
    }
  }, [pins, activeId, map]);

  useEffect(() => {
    return () => {
      for (const m of Object.values(markersRef.current)) map.removeLayer(m);
      markersRef.current = {};
    };
  }, [map]);

  return null;
}

// Memoize icon HTML per type — renderToStaticMarkup is cheap but we hit
// it on every pin update, so caching avoids re-walking the same React tree.
const ICON_HTML_CACHE = new Map<string, string>();
function deviceIconHtml(type: string): string {
  const cached = ICON_HTML_CACHE.get(type);
  if (cached) return cached;
  const html = renderToStaticMarkup(<DeviceIcon type={type} size={21} />);
  ICON_HTML_CACHE.set(type, html);
  return html;
}

function pinHTML(pin: MapPin, active: boolean): string {
  const hex = colorOklch(pin.color);
  const iconSvg = deviceIconHtml(pin.type);
  const ringHTML = `<span class="ring"></span>`;
  const tailHTML = `<span class="pin-tail" style="background:${hex}"></span>`;
  return (
    `<div class="pin${active ? " active" : ""}" style="--pin-color:${hex}">` +
    `${ringHTML}` +
    `<div class="pin-dot" style="background:${hex}">${iconSvg}</div>` +
    `${tailHTML}` +
    `</div>`
  );
}

/**
 * Reframes the map. Three triggers:
 *   - set of pins / me changes (auto-fit on first load + report ingest)
 *   - activeId set → fly to that pin (with sheet-aware offset)
 *   - fitToken bumped → user clicked "Fit all"
 *
 * Padding accounts for the bottom sheet (mobile ≤899px) and left side
 * panel (≥900px), so pins never land behind the sheet/panel.
 */
function FitBounds({
  pins,
  activeId,
  me,
  fitToken,
}: {
  pins: MapPin[];
  activeId?: string;
  me: MeLocation | null;
  fitToken?: number;
}) {
  const map = useMap();
  const prevKey = useRef<string>("");

  useEffect(() => {
    const key = `${fitToken ?? 0}|${activeId ?? "_"}|${pins.map((p) => p.accessoryId).join(",")}|${me ? `${me.lat},${me.lng}` : ""}`;
    if (key === prevKey.current) return;
    prevKey.current = key;

    if (activeId) {
      const focus = pins.find((p) => p.accessoryId === activeId);
      if (focus) {
        flyToVisible(map, [focus.lat, focus.lng], 16);
        return;
      }
    }

    const points: Array<[number, number]> = pins.map((p) => [p.lat, p.lng]);
    if (me) points.push([me.lat, me.lng]);
    if (points.length === 0) return;
    if (points.length === 1) {
      flyToVisible(map, points[0], 16);
      return;
    }
    fitVisible(map, L.latLngBounds(points));
  }, [pins, activeId, me, fitToken, map]);

  return null;
}

/**
 * Visible-area insets. Subtract the sheet from the available viewport so
 * pins are framed in the actually-visible region of the map, not behind
 * the bottom sheet (mobile) or left panel (desktop).
 *
 * Numbers mirror the design's MapView.insets() helper.
 */
function insets() {
  const desktop = typeof window !== "undefined" && window.innerWidth >= 900;
  if (desktop) return { top: 30, left: 504, bottom: 40, right: 40 };
  return {
    top: 90,
    left: 24,
    bottom: Math.round((typeof window !== "undefined" ? window.innerHeight : 0) * 0.5),
    right: 24,
  };
}

function flyToVisible(map: L.Map, latlng: [number, number], zoom: number) {
  const ins = insets();
  const pt = map.project(L.latLng(latlng[0], latlng[1]), zoom);
  const shifted = pt.add(
    L.point((ins.left - ins.right) / 2, (ins.bottom - ins.top) / 2),
  );
  map.flyTo(map.unproject(shifted, zoom), zoom, { duration: 0.6 });
}

function fitVisible(map: L.Map, bounds: L.LatLngBounds) {
  const ins = insets();
  map.fitBounds(bounds, {
    paddingTopLeft: L.point(ins.left, ins.top),
    paddingBottomRight: L.point(ins.right, ins.bottom),
    animate: true,
    duration: 0.6,
    maxZoom: 16,
  });
}
