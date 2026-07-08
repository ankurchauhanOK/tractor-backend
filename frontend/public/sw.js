const CACHE = "tractor-ocr-v1";
const STATIC_CACHE = "tractor-ocr-static-v1";
const API_CACHE = "tractor-ocr-api-v1";
const IMAGE_CACHE = "tractor-ocr-image-v1";

const PRECACHE_URLS = [
  "/",
  "/upload",
  "/manifest.json",
  "/icon-192x192.png",
  "/icon-512x512.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter(
            (k) =>
              k !== CACHE &&
              k !== STATIC_CACHE &&
              k !== API_CACHE &&
              k !== IMAGE_CACHE
          )
          .map((k) => caches.delete(k))
      )
    )
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API calls: network first, fallback to cache
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // Uploaded images: cache first
  if (url.pathname.startsWith("/uploads/")) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }

  // Navigation requests: network first
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, CACHE));
    return;
  }

  // Static assets: cache first
  event.respondWith(cacheFirst(request, STATIC_CACHE));
});

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.mode === "navigate") {
      return caches.match("/");
    }
    return new Response("Offline", { status: 503 });
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("Offline", { status: 503 });
  }
}
