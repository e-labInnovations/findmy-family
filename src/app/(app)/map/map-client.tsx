"use client";

/**
 * Thin client wrapper around <MapView>.
 *
 * Leaflet calls `window` at module-eval time, so it can't run during
 * SSR. We dynamic-import with ssr:false here (allowed in client
 * components, not allowed in server components per Next 16). Server
 * pages import this wrapper directly.
 */
import nextDynamic from "next/dynamic";

const MapView = nextDynamic(() => import("./map-view"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: "100%",
        background: "var(--surface)",
        borderRadius: "var(--radius-md)",
      }}
    />
  ),
});

export default MapView;
