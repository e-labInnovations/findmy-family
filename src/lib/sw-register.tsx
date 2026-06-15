"use client";

import { useEffect } from "react";

/**
 * Registers /sw.js in production only. Dev builds skip registration
 * because Next's dev server doesn't emit a stable asset graph and a
 * cached old chunk will break HMR.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("[sw] register failed", err);
    });
  }, []);
  return null;
}
