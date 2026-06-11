"use client";

import { useEffect } from "react";

/**
 * Lightweight transient toast. Caller owns the message state, this
 * component handles auto-dismiss + rendering. Positioned above the
 * bottom tabbar on mobile / over the map on desktop via globals.css.
 */
export function Toast({
  message,
  onDismiss,
  duration = 2500,
}: {
  message: string | null;
  onDismiss: () => void;
  duration?: number;
}) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDismiss, duration);
    return () => clearTimeout(t);
  }, [message, onDismiss, duration]);

  if (!message) return null;
  return (
    <div className="toast" role="status" aria-live="polite">
      {message}
    </div>
  );
}
