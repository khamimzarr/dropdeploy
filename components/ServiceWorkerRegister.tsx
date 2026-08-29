"use client";

import { useEffect } from "react";

/**
 * Registers the PWA service worker. Only runs in the browser and only in
 * production build (sw caching during dev can cause stale assets).
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* sw unavailable — app still works, just without offline shell */
    });
  }, []);

  return null;
}