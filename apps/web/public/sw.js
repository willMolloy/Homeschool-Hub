// Placeholder service worker: installable PWA shell only. No offline caching in v1 (see spec scope cut).
// Offline caching is deliberately deferred until the logging design is piloted (S1-21 context).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
