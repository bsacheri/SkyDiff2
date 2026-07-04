import { APP_VERSION } from "./shared/forecast-core.js";

const STATIC_CACHE = `skydiff2-static-${APP_VERSION}`;
const DATA_CACHE = `skydiff2-data-${APP_VERSION}`;
const BASE_PATH = new URL(self.registration.scope).pathname;
const assetUrl = (path) => `${BASE_PATH}${path}`;
const APP_SHELL = [
  BASE_PATH,
  assetUrl("index.html"),
  assetUrl("styles.css"),
  assetUrl("app.js"),
  assetUrl("manifest.webmanifest"),
  assetUrl("app-icon.svg"),
  assetUrl("favicon.svg"),
  assetUrl("vendor/echarts.min.js"),
  assetUrl("shared/forecast-core.js"),
  assetUrl("shared/provider-registry.js"),
  assetUrl("shared/nowcast-core.js")
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith("skydiff2-") && key !== STATIC_CACHE && key !== DATA_CACHE)
        .map((key) => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname.startsWith(`${BASE_PATH}api/`) || url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request, DATA_CACHE));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
});

async function handleNavigation(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(STATIC_CACHE);
    cache.put(assetUrl("index.html"), response.clone());
    return response;
  } catch {
    return (await caches.match(assetUrl("index.html"))) || Response.error();
  }
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) || Response.error();
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((response) => {
      cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  if (cached) {
    return cached;
  }

  const networkResponse = await networkPromise;
  return networkResponse || Response.error();
}
