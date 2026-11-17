/* Capable — offline service worker (web/PWA only; the iOS app does not use it).

   Versioning: bump CACHE whenever any app file changes. Corrected rules and
   wording then reach returning users on their next visit.

   This worker only ever touches the Cache Storage it owns. It never reads or
   clears localStorage, so saved answers and preferences survive every update. */
const CACHE = "capable-v7-2026-11-15";
const ASSETS = [
  "./",
  "./index.html",
  "./rules.js",
  "./engine.js",
  "./demo-data.js",
  "./app.js",
  "./manifest.json",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png"
];

self.addEventListener("install", (e) => {
  // cache: "reload" skips the HTTP cache so a new version never precaches stale files.
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS.map((u) => new Request(u, { cache: "reload" }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("capable-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isCode(url) {
  return /\.(js|json|html)$/.test(url.pathname) || url.pathname.endsWith("/");
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;

  // Pages, scripts and the manifest: network first, so corrected rules and
  // wording arrive as soon as there is a connection; cached copy when offline.
  if (req.mode === "navigate" || isCode(url)) {
    e.respondWith(
      fetch(req, { cache: "no-cache" })
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req.mode === "navigate" ? "./index.html" : req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req.mode === "navigate" ? "./index.html" : req, { ignoreSearch: true })
          .then((r) => r || caches.match("./index.html")))
    );
    return;
  }

  // Icons: cache first.
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }))
  );
});
