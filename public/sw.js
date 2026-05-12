const CACHE_NAME = "automec-v1";
const STATIC_CACHE = "automec-static-v1";
const PAGES_CACHE = "automec-pages-v1";
const API_CACHE = "automec-api-v1";

const STATIC_ASSETS = [
  "/",
  "/app",
  "/app/os",
  "/app/clientes",
  "/app/veiculos",
  "/app/estoque",
  "/app/agenda",
  "/app/orcamentos",
  "/app/financeiro",
  "/app/funcionarios",
  "/app/comissoes",
  "/app/garantias",
  "/app/financeiro-relatorio",
  "/offline",
  "/manifest.json",
  "/icon-192x192.svg",
  "/icon-512x512.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Ignora falhas de cache individual para não bloquear install
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (![STATIC_CACHE, PAGES_CACHE, API_CACHE].includes(key)) {
              return caches.delete(key);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API Supabase: NetworkFirst
  if (/^https:\/\/[a-z0-9-]+\.supabase\.co\/.*$/i.test(url.href)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(API_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            if (cached) return cached;
            return new Response(JSON.stringify({ error: "offline" }), {
              status: 503,
              headers: { "Content-Type": "application/json" },
            });
          });
        })
    );
    return;
  }

  // Fontes Google: CacheFirst
  if (
    url.hostname === "fonts.googleapis.com" ||
    url.hostname === "fonts.gstatic.com"
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Assets estáticos (JS, CSS, SVG, etc.): CacheFirst
  if (
    request.destination === "script" ||
    request.destination === "style" ||
    request.destination === "image" ||
    request.destination === "font" ||
    /\.(js|css|svg|png|woff2?|json)$/i.test(url.pathname)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Navegação (HTML pages): NetworkFirst com fallback offline
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(PAGES_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            if (cached) return cached;
            return caches.match("/offline").then((offlinePage) => {
              if (offlinePage) return offlinePage;
              return new Response(
                "<h1>Offline</h1><p>Você está offline.</p>",
                {
                  status: 503,
                  headers: { "Content-Type": "text/html" },
                }
              );
            });
          });
        })
    );
    return;
  }

  // Default: network com cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
