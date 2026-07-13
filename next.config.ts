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
  // Lets the dev server's HMR/webpack websocket connect when the app is opened
  // from another device on the same network (e.g. a phone at http://192.168.x.x:3000)
  // instead of localhost — otherwise Next.js blocks that cross-origin dev request by
  // default, which can leave the page visually rendered but not actually interactive.
  // Dev-only; has no effect on the production build.
  allowedDevOrigins: ["192.168.1.124"],
};

export default nextConfig;
