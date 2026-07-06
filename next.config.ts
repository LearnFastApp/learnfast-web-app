import type { NextConfig } from "next";

// PWA disabled: aggressive Workbox precaching caused stale chunk URLs after
// each deployment, breaking the /session/[code] feedback page with a hard
// Safari "FetchEvent.respondWith no-response" error. A cleanup sw.js in
// public/ clears existing caches in users' browsers.

const nextConfig: NextConfig = {
  serverExternalPackages: ["firebase-admin", "firebase"],
  images: {
    formats: ["image/webp"],
  },
};

export default nextConfig;
