/**
 * A&D Garage service worker.
 *
 * Exists for one reason: iOS will not deliver a web push notification without
 * one. It is served from the origin root so its scope covers /garage, which is
 * where the app is installed from.
 *
 * Deliberately does NOT cache anything. The Garage is always-live by decision
 * (Jose, 2026-09-22 — stale tasks are worse than a moment's load), and a
 * caching service worker is the fastest way to break that rule by accident.
 */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Asphalt & Dirt", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "Asphalt & Dirt";
  const options = {
    body: data.body || "",
    // One icon set, already in the manifest.
    icon: data.icon || "/img/garage/icon/icon-192.png",
    badge: data.badge || "/img/garage/icon/icon-192.png",
    // `tag` collapses a re-send of the same thing instead of stacking banners.
    tag: data.tag || undefined,
    renotify: Boolean(data.tag),
    requireInteraction: data.requireInteraction === true,
    data: { url: data.url || "/garage" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/garage";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      // Reuse an open Garage window rather than opening a second one.
      for (const client of clients) {
        if (client.url.includes("/garage") && "focus" in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
