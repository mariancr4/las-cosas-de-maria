/* Service worker: permite instalar la web como app y jugar sin conexión.
   Cambia VERSION cada vez que se modifiquen archivos para forzar la actualización. */
const VERSION = "maria-v2";
const ARCHIVOS = [
  "/", "/index.html", "/styles.css", "/app.js", "/videos.js", "/manifest.webmanifest",
  "/img/icono-192.png", "/img/icono-512.png", "/img/favicon.png", "/img/apple-touch-icon.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  if (url.origin === location.origin) {
    // Primero la red (para ver siempre lo último), y si no hay conexión, la copia guardada
    e.respondWith(
      fetch(e.request)
        .then((r) => { const copia = r.clone(); caches.open(VERSION).then((c) => c.put(e.request, copia)); return r; })
        .catch(() => caches.match(e.request).then((r) => r || caches.match("/index.html")))
    );
  } else if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    // Tipografía: se guarda la primera vez
    e.respondWith(
      caches.match(e.request).then((r) => r || fetch(e.request).then((res) => {
        const copia = res.clone(); caches.open(VERSION).then((c) => c.put(e.request, copia)); return res;
      }))
    );
  }
  // Los vídeos de YouTube necesitan conexión y no se guardan.
});
