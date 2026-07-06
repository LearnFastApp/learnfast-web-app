// Cleanup service worker — replaces a stale Workbox precache SW that caused
// "FetchEvent.respondWith no-response" errors on the /session/[code] feedback
// page after each deployment invalidated cached chunk URLs.
//
// This SW immediately takes control, wipes all stale caches, then steps aside
// so all requests go straight to the network. It will unregister itself once
// caches are clear.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
      .then(() => self.registration.unregister())
  );
});
