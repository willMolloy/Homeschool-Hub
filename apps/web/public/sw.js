// Placeholder service worker: installable PWA shell only. No offline caching in v1 (see spec scope cut).
// Ticket S1-04 replaces this with a versioned shell cache keyed on ENGINE_VERSION.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
