"use client";

import { useEffect, useState } from "react";

export interface MyLocation {
  lat: number;
  lng: number;
  accuracy: number;
}

export type MyLocationState =
  | { kind: "loading" }
  | { kind: "denied" }
  | { kind: "unsupported" }
  | { kind: "error"; message: string }
  | { kind: "ok"; loc: MyLocation };

/**
 * Subscribe to navigator.geolocation. Returns a state machine so the UI
 * can distinguish "permission denied / blocked" from "still waiting for
 * first fix" — the original null-return version made silent denials
 * indistinguishable from in-progress loads.
 *
 * Tries getCurrentPosition first (fast one-shot), then watchPosition
 * for updates as the user moves.
 */
export function useMyLocation(): MyLocationState {
  const [state, setState] = useState<MyLocationState>({ kind: "loading" });

  useEffect(() => {
    console.log("[geolocation] hook mounted");
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      console.warn("[geolocation] navigator.geolocation unavailable");
      setState({ kind: "unsupported" });
      return;
    }
    console.log("[geolocation] requesting position…");
    const handle = (pos: GeolocationPosition) => {
      console.log("[geolocation] OK", pos.coords.latitude, pos.coords.longitude);
      setState({
        kind: "ok",
        loc: {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        },
      });
    };
    const fail = (err: GeolocationPositionError) => {
      console.warn(
        "[geolocation] error code=" + err.code + " message=" + err.message,
      );
      if (err.code === err.PERMISSION_DENIED) {
        setState({ kind: "denied" });
      } else {
        setState({ kind: "error", message: err.message });
      }
    };
    navigator.geolocation.getCurrentPosition(handle, fail, {
      enableHighAccuracy: false,
      maximumAge: 30_000,
      timeout: 10_000,
    });
    const watchId = navigator.geolocation.watchPosition(handle, fail, {
      enableHighAccuracy: false,
      maximumAge: 30_000,
      timeout: 15_000,
    });
    return () => {
      console.log("[geolocation] hook unmounted, clearing watch");
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  return state;
}

/** Convenience: just the lat/lng if we have one, else null. */
export function useMyLatLng(): MyLocation | null {
  const s = useMyLocation();
  return s.kind === "ok" ? s.loc : null;
}
