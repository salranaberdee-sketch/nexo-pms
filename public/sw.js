// Nexo PMS Service Worker
// Cache strategy + offline fallback + update notifications

// Bump this when deploying to bust old caches
const CACHE_VERSION = "nexo-pms-v3";
const CACHE_NAME = CACHE_VERSION;

// App shell — only cache pages that exist as real routes (not redirects)
const PRECACHE_ASSETS = [
  "/dashboard",
  "/icon-96x96.png",
  "/icon-192x192.png",
  "/icon-512x512.png",
  "/apple-touch-icon.png",
];

// ── Install: pre-cache app shell ─────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting()) // take over immediately
  );
});

// ── Activate: clean up old caches + notify clients an update happened ────────
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
      .then(() => {
        // Tell every open tab that a new version is live → show refresh toast
        return self.clients
          .matchAll({ type: "window", includeUncontrolled: true })
          .then((clients) => {
            clients.forEach((client) =>
              client.postMessage({ type: "SW_UPDATED", version: CACHE_VERSION })
            );
          });
      })
  );
});

// ── Fetch strategy ───────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET, non-http, and chrome-extension requests
  if (request.method !== "GET") return;
  if (!url.protocol.startsWith("http")) return;

  // Network-only: Supabase API, auth endpoints, Next.js image optimization
  if (
    url.hostname.includes("supabase.co") ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/image")
  ) {
    event.respondWith(fetch(request));
    return;
  }

  // Cache-first: Next.js static assets (hashed filenames — immutable)
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

  // Network-first: pages + other resources — offline fallback to cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful HTML navigation responses for offline fallback
        if (response.ok && request.mode === "navigate") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(request).then((cached) => {
          if (cached) return cached;
          // Last resort for navigation: return offline page or cached dashboard
          if (request.mode === "navigate") {
            return (
              caches.match("/offline") ||
              caches.match("/dashboard") ||
              new Response(
                '<!DOCTYPE html><html><body style="font-family:sans-serif;padding:2rem;background:#0f172a;color:#94a3b8"><h2>ออฟไลน์อยู่</h2><p>ไม่มีอินเทอร์เน็ต กรุณาตรวจสอบการเชื่อมต่อ</p></body></html>',
                { headers: { "Content-Type": "text/html; charset=utf-8" } }
              )
            );
          }
          return new Response("Offline", {
            status: 503,
            headers: { "Content-Type": "text/plain" },
          });
        });
      })
  );
});

// ── Push notification handler ─────────────────────────────────────────────────
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

// ── Notification click: open or focus the app ────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

// ── Push subscription change: re-subscribe when subscription expires ─────────
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    self.registration.pushManager
      .subscribe(event.oldSubscription.options)
      .then((subscription) => {
        // TODO: send updated subscription to backend when push is wired up
        console.log("[SW] Push subscription renewed:", subscription.endpoint);
      })
  );
});
