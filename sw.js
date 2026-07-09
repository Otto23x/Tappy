/* Service worker di Bcube Dashboard: dopo il primo avvio l'app funziona
   anche offline (l'interfaccia, i programmi, lo storico, i video già visti).
   - la pagina: rete prima, cache di riserva
   - script esterni (YouTube iframe API, Google Identity): cache prima, rete di riserva
   Nota: Bluetooth, ricerca YouTube dal vivo, Gemini e Google Drive richiedono
   comunque una connessione reale — questo service worker non può renderli
   disponibili offline, cache solo l'app stessa e le librerie di supporto. */
const CACHE = "bcube-v1";
const EXTERNAL = [
  "https://www.youtube.com/iframe_api",
  "https://accounts.google.com/gsi/client"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(EXTERNAL.map(u => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);

  // Script esterni (YouTube API, Google Identity): cache-first
  if (u.hostname === "www.youtube.com" || u.hostname === "accounts.google.com") {
    e.respondWith(
      caches.match(e.request).then(r => r || fetch(e.request).then(res => {
        const cl = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, cl));
        return res;
      }))
    );
    return;
  }

  // Pagina principale: network-first con riserva in cache (funziona offline
  // dopo il primo avvio, mostra sempre la versione più recente quando online)
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request).then(res => {
        const cl = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, cl));
        return res;
      }).catch(() => caches.match(e.request))
    );
  }
});
