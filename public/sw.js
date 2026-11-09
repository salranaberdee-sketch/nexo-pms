// Nexo PMS Service Worker
// Handles offline caching and background sync

const CACHE_NAME = "nexo-pms-v1";
const OFFLINE_URL = "/offline";

// Assets to pre-cache on install (app shell)
const PRECACHE_ASSETS = [
  "/",
  "/dashboard",
  "/icon-192x192.png",
  "/icon-512x512.png",
  "/apple-touch-icon.png",
];

// Install: pre-cache app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: remove old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch strategy:
// - Supabase API calls → network-only (always fresh)
// - Next.js _next/static → cache-first (immutable)
// - Pages/navigation → network-first, fall back to cache
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and chrome-extension requests
  if (request.method !== "GET") return;
  if (!url.protocol.startsWith("http")) return;

  // Network-only: Supabase API and auth endpoints
  if (
    url.hostname.includes("supabase.co") ||
    url.pathname.startsWith("/api/")
  ) {
    event.respondWith(fetch(request));
    return;
  }

  // Cache-first: Next.js static assets (hashed filenames — safe to cache forever)
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Network-first: pages and other requests
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful HTML responses for offline fallback
        if (response.ok && request.mode === "navigate") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => {
        // Offline fallback: return cached version if available
        return caches.match(request).then((cached) => {
          if (cached) return cached;
          // For navigation requests, return cached dashboard as last resort
          if (request.mode === "navigate") {
            return caches.match("/dashboard");
          }
          return new Response("Offline", { status: 503 });
        });
      })
  );
});

// Push notification handler
self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || "",
    icon: "/icon-192x192.png",
    badge: "/icon-96x96.png",
    vibrate: [100, 50, 100],
    data: {
      url: data.url || "/dashboard",
      dateOfArrival: Date.now(),
    },
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "Nexo PMS", options)
  );
});

// Notification click: open or focus the app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window if open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        // Otherwise open new window
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});
